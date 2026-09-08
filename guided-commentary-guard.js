(() => {
  const GENERIC_WRONG = 'não coincide com o gabarito';
  const GENERIC_TRAP = 'compare cada distrator com a regra central';
  let geminiLoading = false;

  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const norm = (v) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const quote = (v, max = 210) => {
    const s = clean(v);
    return `“${s.length > max ? s.slice(0, max - 1) + '…' : s}”`;
  };

  function getQuestionData() {
    const area = document.getElementById('questionArea');
    if (!area) return null;
    const optionEls = [...area.querySelectorAll('.guided-option')];
    if (optionEls.length !== 4) return null;
    const correct = optionEls.findIndex(el => el.classList.contains('correct'));
    if (correct < 0) return null;
    const meta = [...area.querySelectorAll('.guided-kicker .guided-source')].map(el => clean(el.textContent));
    const verdictRule = clean(area.querySelector('.guided-verdict span')?.textContent);
    return {
      question: clean(area.querySelector('h2')?.textContent),
      source: meta[0] || '',
      subject: meta[1] || '',
      topic: meta[2] || '',
      options: optionEls.map(el => clean(el.querySelector('span:last-child')?.textContent)),
      correct,
      rule: verdictRule
    };
  }

  function penalSpecific(data, index) {
    const topic = norm(data.topic);
    const text = norm(data.options[index]);
    const correct = index === data.correct;

    if (topic.includes('erro de proibicao')) {
      if (correct) return 'Correta porque distingue os dois efeitos previstos para o erro sobre a ilicitude: se inevitável, o agente fica isento de pena; se evitável, a pena pode ser reduzida. O instituto atua no juízo de culpabilidade, não na tipicidade.';
      if (text.includes('tipicidade')) return 'Errada porque confunde erro de proibição com erro de tipo. O erro de proibição não elimina a tipicidade do fato; ele recai sobre a potencial consciência da ilicitude e repercute na culpabilidade.';
      if (text.includes('nunca') && text.includes('culpabilidade')) return 'Errada porque nega justamente o efeito jurídico do instituto. O erro de proibição inevitável afasta a culpabilidade e isenta de pena; o evitável pode gerar redução da pena.';
      if (text.includes('desconhecimento') || text.includes('absolvicao automatica')) return 'Errada porque mero desconhecimento da lei não gera absolvição automática. A ignorância da lei é inescusável; é preciso erro sobre a ilicitude do fato e, para isenção, que ele seja inevitável.';
    }

    if (topic.includes('erro de tipo')) {
      if (correct) return 'Correta porque o erro sobre elemento do tipo exclui o dolo; só haverá punição culposa se o delito admitir modalidade culposa e estiverem presentes seus requisitos.';
      if (text.includes('jamais') && text.includes('dolo')) return 'Errada porque o erro de tipo pode justamente excluir o dolo quando recai sobre elemento constitutivo do tipo.';
      if (text.includes('doloso') || text.includes('mais grave')) return 'Errada porque o erro de tipo não transforma o fato em crime doloso mais grave; em regra ele afasta o dolo.';
      if (text.includes('culpa') && text.includes('sempre')) return 'Errada porque a punição por culpa depende de previsão legal de modalidade culposa; não existe responsabilidade culposa automática.';
    }

    if (topic.includes('tentativa')) {
      if (correct) return 'Correta porque houve início de execução e a consumação não ocorreu por circunstância alheia à vontade do agente, estrutura típica da tentativa punível.';
      if (text.includes('cogitacao')) return 'Errada porque o agente já ultrapassou a fase de cogitação e iniciou atos executórios; a não consumação, por si só, não reconduz o fato à cogitação.';
      if (text.includes('mesma pena') || text.includes('sem reducao')) return 'Errada porque a tentativa não recebe necessariamente a mesma pena do crime consumado; o Código Penal prevê redução própria, ressalvadas hipóteses legais.';
      if (text.includes('desista voluntariamente')) return 'Errada porque desistência voluntária é instituto distinto: nela o agente interrompe voluntariamente a execução que poderia prosseguir.';
    }

    if (topic.includes('desistencia voluntaria')) {
      if (correct) return 'Correta porque, na desistência voluntária, o agente abandona espontaneamente a execução que ainda podia continuar e responde apenas pelos atos já praticados.';
      if (text.includes('nunca produz')) return 'Errada porque a desistência voluntária produz efeito jurídico relevante: afasta a responsabilização pela tentativa do crime inicialmente pretendido.';
      if (text.includes('consumado')) return 'Errada porque, se a consumação não ocorreu, não se imputa automaticamente o crime consumado; subsiste responsabilidade pelos atos já praticados.';
      if (text.includes('intervencao externa')) return 'Errada porque intervenção externa que impede a continuação caracteriza tentativa frustrada por circunstância alheia à vontade, e não desistência voluntária.';
    }

    if (topic.includes('crime impossivel')) {
      if (correct) return 'Correta porque a tentativa não é punida quando a consumação é absolutamente impossível pela ineficácia absoluta do meio ou impropriedade absoluta do objeto.';
      if (text.includes('pena superior')) return 'Errada porque crime impossível é hipótese de não punição da tentativa, não de agravamento da pena.';
      if (text.includes('irrelevante')) return 'Errada porque a absoluta ineficácia do meio é exatamente uma das hipóteses legais de crime impossível.';
      if (text.includes('todo erro de execucao')) return 'Errada porque erro na execução e crime impossível são institutos diferentes; nem todo desvio na execução torna a consumação absolutamente impossível.';
    }

    return null;
  }

  function genericWrongReason(data, index) {
    const wrong = data.options[index];
    const right = data.options[data.correct];
    const w = norm(wrong);
    const r = norm(data.rule);

    if (/\b(sempre|nunca|todo|toda|qualquer|automaticamente|necessariamente)\b/.test(w)) {
      return `Errada porque transforma a solução em regra absoluta. A alternativa afirma ${quote(wrong)}, mas o caso exige a disciplina condicionada da regra correta: ${quote(data.rule || right)}.`;
    }
    if (/\b(somente|apenas|exclusivamente|unicamente)\b/.test(w)) {
      return `Errada porque cria uma exclusividade ou requisito que a regra aplicável não estabelece. O ponto incorreto está em ${quote(wrong)}; a solução juridicamente correta é ${quote(data.rule || right)}.`;
    }
    if (/\b(independe|dispensa|irrelevante|sem necessidade)\b/.test(w)) {
      return `Errada porque elimina requisito ou consequência juridicamente relevante. A alternativa sustenta ${quote(wrong)}, enquanto a regra aplicável exige observar: ${quote(data.rule || right)}.`;
    }
    if (w.includes('tipicidade') && r.includes('culpabilidade')) {
      return `Errada porque desloca o efeito para a tipicidade quando a regra central opera no plano da culpabilidade. A afirmação problemática é ${quote(wrong)}.`;
    }
    if (w.includes('culpabilidade') && r.includes('dolo')) {
      return `Errada porque mistura planos distintos da teoria do delito: a alternativa fala em culpabilidade, enquanto a regra central do item trata do dolo/tipicidade. Compare ${quote(wrong)} com ${quote(data.rule || right)}.`;
    }

    return `Errada pelo conteúdo jurídico que afirma, e não simplesmente porque diverge do gabarito. Ela sustenta ${quote(wrong)}. O contraste decisivo é com a regra correta: ${quote(data.rule || right)}. Em prova, descarte-a porque substitui a consequência/requisito correto por essa proposição incompatível.`;
  }

  function correctReason(data) {
    const special = penalSpecific(data, data.correct);
    if (special) return special;
    return data.rule
      ? `Correta porque aplica ao caso a regra central do item: ${data.rule}`
      : `Correta porque expressa a consequência jurídica adequada ao caso: ${data.options[data.correct]}`;
  }

  function betterTrap(data) {
    const topic = norm(data.topic);
    if (topic.includes('erro de proibicao')) {
      return 'A pegadinha é separar erro de tipo de erro de proibição e, dentro deste, distinguir erro inevitável de evitável. Erro de tipo pode afetar dolo/tipicidade; erro de proibição recai sobre a consciência da ilicitude e repercute na culpabilidade.';
    }
    if (topic.includes('erro de tipo')) {
      return 'A pegadinha é não confundir erro sobre elemento do tipo com erro sobre a ilicitude. Aqui o foco é o dolo: erro de tipo pode excluí-lo, com eventual punição culposa somente quando prevista em lei.';
    }
    return `O ponto de discriminação é o efeito jurídico concreto. Compare cada alternativa com esta regra: ${data.rule || data.options[data.correct]}. Distratores típicos absolutizam a regra, retiram um requisito, criam requisito inexistente ou trocam o instituto/consequência aplicável.`;
  }

  function improve() {
    const analysis = document.getElementById('analysisArea');
    if (!analysis) return;
    const data = getQuestionData();
    if (!data) return;

    const altItems = [...analysis.querySelectorAll('.alt-analysis-item')];
    if (altItems.length === 4) {
      altItems.forEach((item, i) => {
        const span = item.querySelector('span');
        if (!span) return;
        const current = clean(span.textContent);
        const isGeneric = norm(current).includes(GENERIC_WRONG) || current.length < 28;
        if (i === data.correct) {
          if (isGeneric || norm(current).includes('codigo penal diferencia erro de proibicao')) {
            span.innerHTML = `<strong>Certa:</strong> ${correctReason(data)}`;
          }
          return;
        }
        if (isGeneric) {
          const specific = penalSpecific(data, i) || genericWrongReason(data, i);
          span.innerHTML = `<strong>Errada:</strong> ${specific}`;
        }
      });
    }

    const cards = [...analysis.querySelectorAll('.analysis-card')];
    for (const card of cards) {
      const title = norm(card.querySelector('h3')?.textContent);
      if (!title.includes('armadilha')) continue;
      const p = card.querySelector('p');
      if (p && norm(p.textContent).includes(GENERIC_TRAP)) p.textContent = betterTrap(data);
    }

    let style = document.getElementById('guided-commentary-guard-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'guided-commentary-guard-style';
      style.textContent = '.alt-analysis-item{display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:7px}.alt-analysis-item>b{width:auto}.alt-analysis-item span strong{margin-right:4px}.guided-gemini-card button{margin-top:9px}';
      document.head.appendChild(style);
    }
  }

  function ensureGeminiLoaded() {
    if (window.OABGemini) return Promise.resolve(window.OABGemini);
    return new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-oab-gemini-provider]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'gemini-provider.js';
        script.dataset.oabGeminiProvider = '1';
        document.head.appendChild(script);
      }
      if (window.OABGemini) return resolve(window.OABGemini);
      script.addEventListener('load', () => resolve(window.OABGemini), { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar o conector Gemini.')), { once: true });
    });
  }

  function parseJson(text) {
    let raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
    if (a >= 0 && b > a) raw = raw.slice(a, b + 1);
    return JSON.parse(raw);
  }

  function buildGeminiPrompt(data) {
    const options = data.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
    return `Analise esta questão para estudo da 1ª fase da OAB.\n\nMATÉRIA: ${data.subject}\nTEMA: ${data.topic}\nORIGEM: ${data.source}\nENUNCIADO: ${data.question}\n\nALTERNATIVAS:\n${options}\n\nGABARITO FIXO: ${String.fromCharCode(65 + data.correct)}\nCOMENTÁRIO/REGRA JÁ REGISTRADA: ${data.rule || 'sem comentário editorial suficiente'}\n\nRetorne SOMENTE JSON válido neste formato: {"concept":"...","trap":"...","alternatives":[{"letter":"A","why":"..."},{"letter":"B","why":"..."},{"letter":"C","why":"..."},{"letter":"D","why":"..."}],"rule":"...","memory":"..."}. Cada alternativa precisa ter justificativa jurídica ESPECÍFICA: diga qual requisito, exceção, competência, prazo, efeito ou conceito a torna correta/errada. É proibido justificar uma errada apenas dizendo que não coincide com o gabarito. Não altere o gabarito. Não invente artigo, súmula ou precedente; se não tiver segurança no número, explique a regra sem numeração.`;
  }

  function applyGeminiAnalysis(data, parsed) {
    const analysis = document.getElementById('analysisArea');
    if (!analysis) return;
    const cards = [...analysis.querySelectorAll('.analysis-card')];
    const findCard = (needle) => cards.find(card => norm(card.querySelector('h3')?.textContent).includes(needle));
    const concept = findCard('conceito por tras');
    const trap = findCard('armadilha');
    const alts = findCard('alternativa por alternativa');
    const rule = findCard('regra que precisa ficar');
    const memory = findCard('fixacao na memoria');

    if (concept?.querySelector('p') && parsed.concept) concept.querySelector('p').textContent = clean(parsed.concept);
    if (trap?.querySelector('p') && parsed.trap) trap.querySelector('p').textContent = clean(parsed.trap);
    if (rule?.querySelector('p') && parsed.rule) rule.querySelector('p').textContent = clean(parsed.rule);
    if (memory?.querySelector('p') && parsed.memory) memory.querySelector('p').textContent = clean(parsed.memory);

    if (alts && Array.isArray(parsed.alternatives) && parsed.alternatives.length === 4) {
      const items = [...alts.querySelectorAll('.alt-analysis-item')];
      items.forEach((item, i) => {
        const span = item.querySelector('span');
        if (!span) return;
        const why = clean(parsed.alternatives[i]?.why);
        if (!why) return;
        span.innerHTML = `<strong>${i === data.correct ? 'Certa' : 'Errada'}:</strong> ${why}`;
      });
    }

    const action = document.getElementById('guidedGeminiAction');
    if (action) {
      action.querySelector('p').textContent = 'Análise jurídica individual das quatro alternativas gerada com a sua própria conta Gemini. O gabarito do OAB APROVA permaneceu fixo.';
      const button = action.querySelector('button');
      if (button) {
        button.textContent = 'Atualizar análise com Gemini';
        button.disabled = false;
      }
    }
  }

  async function generateGeminiAnalysis(button) {
    if (geminiLoading) return;
    const data = getQuestionData();
    if (!data) return;
    geminiLoading = true;
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Gerando análise jurídica…';
    try {
      const gemini = await ensureGeminiLoaded();
      if (!gemini.isConnected()) {
        const connected = await gemini.connect();
        if (!connected) return;
      }
      const text = await gemini.generate({
        system: 'Você é professor de preparação para a OAB. Explique questões com rigor técnico e foco em discriminação entre alternativas. O gabarito fornecido é fixo. Nunca use tautologias como “está errada porque não é o gabarito”.',
        prompt: buildGeminiPrompt(data),
        json: true,
        maxOutputTokens: 2200,
        temperature: 0.1
      });
      const parsed = parseJson(text);
      if (!Array.isArray(parsed.alternatives) || parsed.alternatives.length !== 4) throw new Error('A análise veio incompleta.');
      applyGeminiAnalysis(data, parsed);
    } catch (error) {
      button.disabled = false;
      button.textContent = old;
      const p = document.querySelector('#guidedGeminiAction p');
      if (p) p.textContent = `Não foi possível gerar a análise completa: ${error?.message || error}`;
    } finally {
      geminiLoading = false;
    }
  }

  function installGeminiAction() {
    const analysis = document.getElementById('analysisArea');
    if (!analysis || !getQuestionData() || document.getElementById('guidedGeminiAction')) return;
    const card = document.createElement('article');
    card.id = 'guidedGeminiAction';
    card.className = 'card analysis-card guided-gemini-card';
    card.innerHTML = '<h3>Explicação completa das alternativas</h3><p>Para questões oficiais sem comentário editorial individual, conecte sua conta Gemini e gere a análise jurídica específica de A, B, C e D.</p><button class="btn primary full" type="button">Conectar Gemini e analisar</button>';
    analysis.appendChild(card);
    card.querySelector('button').onclick = (event) => generateGeminiAnalysis(event.currentTarget);
    ensureGeminiLoaded().then(gemini => {
      if (gemini?.isConnected()) card.querySelector('button').textContent = 'Gerar análise completa com Gemini';
    }).catch(() => {});
  }

  const start = () => {
    const analysis = document.getElementById('analysisArea');
    const question = document.getElementById('questionArea');
    if (!analysis || !question) return;
    const observer = new MutationObserver(() => queueMicrotask(() => { improve(); installGeminiAction(); }));
    observer.observe(analysis, { childList: true, subtree: true, characterData: true });
    observer.observe(question, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    improve();
    installGeminiAction();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
