(() => {
  const CONTEXT_KEY = 'oab-aprova-professor-context-v1';
  const STATE_KEY = 'oab-aprova-premium-v1';

  const text = (el) => (el?.textContent || '').trim();
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {}; }
    catch { return {}; }
  };

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
      profileName: state.profile?.name || null
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

    return {
      source: meta[0] || null,
      subject: meta[1] || null,
      topic: meta[2] || null,
      question,
      options,
      correctLetter: correctIndex >= 0 ? options[correctIndex].letter : null,
      selectedLetter: selectedIndex >= 0 ? options[selectedIndex].letter : null,
      wasCorrect: selectedIndex >= 0 && selectedIndex === correctIndex,
      errorCause: cause,
      editorialNote: text(verdict.querySelector('span')) || null,
      capturedAt: Date.now()
    };
  }

  function saveAndOpenProfessor() {
    const question = buildQuestionContext();
    if (!question) return;
    const payload = {
      version: 1,
      source: 'questao-guiada',
      question,
      study: buildStudySnapshot(),
      createdAt: Date.now()
    };
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    window.location.href = 'ia.html?from=guided';
  }

  function installButton() {
    const after = document.getElementById('guidedAfter');
    if (!after || after.classList.contains('hidden') || !after.querySelector('.guided-verdict')) return;
    if (after.querySelector('[data-open-professor]')) return;

    const wrap = document.createElement('div');
    wrap.className = 'guided-professor-actions';
    wrap.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:12px';
    wrap.innerHTML = '<button class="btn secondary" type="button" data-open-professor>Professor IA: aprofundar esta questão</button><span style="font-size:12px;color:#687588;align-self:center">O professor recebe a questão, sua resposta e seu histórico recente.</span>';
    after.appendChild(wrap);
    wrap.querySelector('[data-open-professor]').addEventListener('click', saveAndOpenProfessor);
  }

  const observer = new MutationObserver(installButton);
  const questionArea = document.getElementById('questionArea');
  if (questionArea) observer.observe(questionArea, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  installButton();
})();
