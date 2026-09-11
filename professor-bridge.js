(() => {
  const CONTEXT_KEY = 'oab-aprova-professor-context-v1';
  const STATE_KEY = 'oab-aprova-premium-v1';
  const CHAT_KEY = 'oab-aprova-professor-chat-v1';
  const I = window.OAB_INTELLIGENCE || null;

  const text = (el) => (el?.textContent || '').trim();
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {}; }
    catch { return {}; }
  };

  function adaptiveSnapshot(state) {
    if (!I) return null;
    try {
      const strategy = state.profile?.strategy === 'balanced' ? 'balanced' : 'core';
      const readiness = I.readiness(state);
      const recommendations = I.recommendations(state, { strategy, limit: 3 }).map(r => ({
        subject: r.subjectName,
        topic: r.topic.label,
        historicalShareWithinSubject: Math.round(r.topic.historicalShare * 100),
        estimatedMastery: Math.round(r.stats.estimated * 100),
        sample: r.stats.n,
        dueReviews: r.stats.due,
        recoverablePointsHeuristic: Number(r.recoverable.toFixed(2)),
        prescribedAction: r.action.label,
        actionReason: I.explainRecommendation(r)
      }));
      return {
        projection: Number(readiness.projected.toFixed(1)),
        diagnosticCoveragePct: Math.round(readiness.coverage * 100),
        robustMasteryPct: Math.round(readiness.robust * 100),
        fragilePointsHeuristic: Number(readiness.fragilePoints.toFixed(1)),
        recommendations
      };
    } catch { return null; }
  }

  function buildStudySnapshot() {
    const state = readState();
    const attempts = Array.isArray(state.attempts) ? state.attempts : [];
    const recent = attempts.slice(-80);
    const bySubject = {};
    const causes = {};

    for (const a of recent) {
      const subject = a.subject || 'geral';
      bySubject[subject] ||= { total: 0, correct: 0 };
      bySubject[subject].total += 1;
      if (a.correct) bySubject[subject].correct += 1;
      if (!a.correct && a.cause) causes[a.cause] = (causes[a.cause] || 0) + 1;
    }

    const weakSubjects = Object.entries(bySubject)
      .filter(([, v]) => v.total >= 2)
      .map(([subject, v]) => ({ subject, accuracy: Math.round((v.correct / v.total) * 100), total: v.total }))
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
      .slice(0, 5);

    const reviews = state.reviews && typeof state.reviews === 'object' ? Object.values(state.reviews) : [];
    const now = Date.now();
    const openReviews = reviews.filter(r => !r.mastered).length;
    const dueReviews = reviews.filter(r => !r.mastered && Number(r.due || 0) <= now).length;
    const total = recent.length;
    const correct = recent.filter(a => a.correct).length;

    return {
      recentAttempts: total,
      recentAccuracy: total ? Math.round((correct / total) * 100) : null,
      weakSubjects,
      errorCauses: causes,
      openReviews,
      dueReviews,
      guidedAnswered: Number(state.guided?.answered || 0),
      profileName: state.profile?.name || null,
      adaptive: adaptiveSnapshot(state)
    };
  }

  function buildQuestionContext() {
    const area = document.getElementById('questionArea');
    const verdict = document.querySelector('.guided-verdict');
    if (!area || !verdict) return null;

    const question = text(area.querySelector('h2'));
    const optionEls = [...area.querySelectorAll('.guided-option')];
    if (!question || optionEls.length !== 4) return null;

    const options = optionEls.map((el, i) => ({
      letter: String.fromCharCode(65 + i),
      text: text(el.querySelector('span:last-child')),
      correct: el.classList.contains('correct'),
      selected: el.classList.contains('wrong') || (el.classList.contains('correct') && !area.querySelector('.guided-option.wrong'))
    }));

    const correctIndex = options.findIndex(o => o.correct);
    const selectedIndex = options.findIndex(o => o.selected);
    const meta = [...area.querySelectorAll('.guided-kicker .guided-source')].map(text);
    const cause = text(document.querySelector('[data-cause].active')) || null;
    const state = readState();
    const attempts = Array.isArray(state.attempts) ? state.attempts : [];
    const lastGuidedAttempt = [...attempts].reverse().find(a => a.mode === 'guided');
    const subjectId = lastGuidedAttempt?.subject || null;
    const topic = lastGuidedAttempt?.topic || meta[2] || null;
    let intelligence = null;
    if (I && subjectId && topic) {
      try {
        const resolved = I.resolveTopic(subjectId, topic);
        const ranked = resolved ? I.topicPriority(state, subjectId, resolved) : null;
        if (ranked) intelligence = {
          historicalShareWithinSubject: Math.round(ranked.topic.historicalShare * 100),
          estimatedMastery: Math.round(ranked.stats.estimated * 100),
          sample: ranked.stats.n,
          prescribedAction: ranked.action.label,
          materialAvailable: ranked.material.available,
          materialPriority: ranked.material.priority
        };
      } catch { intelligence = null; }
    }

    return {
      qid: lastGuidedAttempt?.qid || null,
      source: meta[0] || null,
      subject: meta[1] || null,
      topic,
      question,
      options,
      correctLetter: correctIndex >= 0 ? options[correctIndex].letter : null,
      selectedLetter: selectedIndex >= 0 ? options[selectedIndex].letter : null,
      wasCorrect: selectedIndex >= 0 && selectedIndex === correctIndex,
      errorCause: cause || lastGuidedAttempt?.cause || null,
      editorialNote: text(verdict.querySelector('span')) || null,
      intelligence,
      capturedAt: Date.now()
    };
  }

  function saveAndOpenProfessor() {
    const question = buildQuestionContext();
    if (!question) return;
    const payload = {
      version: 2,
      source: 'questao-guiada',
      examTarget: { exam: '48º EOU', firstPhase: '2027-01-10', editalExpected: '2026-09-21', distributionStatus: 'provisória até edital' },
      question,
      study: buildStudySnapshot(),
      createdAt: Date.now()
    };
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    localStorage.removeItem(CHAT_KEY);
    window.location.href = 'ia.html?from=guided';
  }

  function installButton() {
    const after = document.getElementById('guidedAfter');
    if (!after || after.classList.contains('hidden') || !after.querySelector('.guided-verdict')) return;
    if (after.querySelector('[data-open-professor]')) return;

    const wrap = document.createElement('div');
    wrap.className = 'guided-professor-actions';
    wrap.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:12px';
    wrap.innerHTML = '<button class="btn secondary" type="button" data-open-professor>Professor IA: destrinchar como a FGV cobra isto</button><span style="font-size:12px;color:#687588;align-self:center">Recebe a questão, sua resposta, causa do erro e fila adaptativa atual.</span>';
    after.appendChild(wrap);
    wrap.querySelector('[data-open-professor]').addEventListener('click', saveAndOpenProfessor);
  }

  function loadCommentaryGuard() {
    if (document.querySelector('script[data-guided-commentary-guard]')) return;
    const script = document.createElement('script');
    script.src = 'guided-commentary-guard.js';
    script.defer = true;
    script.dataset.guidedCommentaryGuard = '1';
    document.head.appendChild(script);
  }

  function enforceStudyQualityDefaults() {
    const origin = document.getElementById('originFilter');
    if (origin && origin.value === 'all') origin.value = 'official';
    const priority = document.getElementById('priorityFilter');
    if (priority && [...priority.options].some(o => o.value === 'adaptive')) priority.value = 'adaptive';
    const status = document.getElementById('aiStatus');
    if (status) status.textContent = 'Treino principal prioriza FGV oficial e, quando possível, o tema com maior valor adaptativo. Questões autorais só entram após corte editorial.';
  }

  const observer = new MutationObserver(installButton);
  const questionArea = document.getElementById('questionArea');
  if (questionArea) observer.observe(questionArea, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  enforceStudyQualityDefaults();
  installButton();
  loadCommentaryGuard();
})();
