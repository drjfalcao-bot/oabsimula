/* Navegação de contingência independente do módulo principal do OAB APROVA.
   Mantém acessíveis as abas quando uma dependência do painel falhar. */
(() => {
  'use strict';
  const titles = {
    dashboard: ['CENTRAL DE APROVAÇÃO', 'Painel de aprovação'],
    plan: ['ESTRATÉGIA', 'Plano adaptativo'],
    study: ['CONTEÚDO', 'Matérias'],
    questions: ['TREINO', 'Questões'],
    errors: ['MEMÓRIA', 'Erros e reforço'],
    analytics: ['MÉTRICAS', 'Desempenho']
  };
  function openPage(name, updateHash) {
    if (!Object.prototype.hasOwnProperty.call(titles, name)) return;
    document.querySelectorAll('.page[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === name);
    });
    document.querySelectorAll('button.nav-item[data-page]').forEach(el => {
      const active = el.dataset.page === name;
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    const eyebrow = document.getElementById('pageEyebrow');
    const title = document.getElementById('pageTitle');
    if (eyebrow) eyebrow.textContent = titles[name][0];
    if (title) title.textContent = titles[name][1];
    if (updateHash && location.hash.slice(1) !== name) {
      history.replaceState(null, '', '#' + name);
    }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button[data-page], button[data-go-page]');
    if (!target) return;
    const name = target.dataset.page || target.dataset.goPage;
    openPage(name, true);
  });
  window.addEventListener('hashchange', () => openPage(location.hash.slice(1), false));
  if (location.hash) openPage(location.hash.slice(1), false);
})();
