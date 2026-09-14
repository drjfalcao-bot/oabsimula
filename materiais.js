const SUBJECTS=window.OAB_SUBJECTS||[];
const MATERIALS=window.OAB_LEARNING_MATERIALS||{};
const CATALOG=window.OAB_DRIVE_CATALOG||{subjects:{},collections:[]};
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

// Manifesto estático dos 20 pontos de entrada principais. Mantém a validação de integridade
// independente do catálogo rico carregado em drive-materials-catalog.js.
const VALIDATION_FOLDER_MANIFEST=[
  {folder:'1zggrCHwAWbXX8VRddDo1cEeLZ0eQ1Lxn'},{folder:'1Kb40-5LKaSe6Nm0gNzQOoRFYJvCeywQZ'},
  {folder:'1vcxzJl33UdtuN3gUAUEXF4nnLM6Y6t_p'},{folder:'1Vaekb_CPAA5clvUZmIbt6HcgWbW0gayN'},
  {folder:'1gsD3dlCEgb6XDzagj4eJYuTOrAa-vTOQ'},{folder:'1QcoigD_ZflMvNLnV9fMmOeH_RPErVHKo'},
  {folder:'1Z--8_wdCXfQR2wtMu5JREuLijUdzw89M'},{folder:'1seZBGDcygVpOMajsEsDXHph7yW7hFAwm'},
  {folder:'1xoo1EvALJVpdS9ddlT1aba3vKN2NwKrD'},{folder:'14YC1A3Une_hDi9MRpQHVJAoubR1aaR31'},
  {folder:'1EriKe3UOfeesBQcHGZnSxdmGj5C0wwWa'},{folder:'1CqmhsZ6qH4IVLIrzczdS9dq0tHew-WI3'},
  {folder:'1qiPDOI8BrjYUsYAF_vMOqYFnI1R-ZbI7'},{folder:'13GnLrqqOOsVePMB4xBqYu4dL2ySXmYAy'},
  {folder:'1klZb0EE5LircioBlYjb1DwcS5zq2rpTL'},{folder:'1BYmsbeSziOuR8ESpxwZdGs0iwNPP-VTB'},
  {folder:'1yF9TTVthp0yVFiPWSTAuUblw_IC_n8OC'},{folder:'1DSCyD1riojezakflHtEONUDF5dmKUEEB'},
  {folder:'1FrPblXlznLaht2rqvG1QyC55ZltRmlxj'},{folder:'1m5G-g-MG8YCF3Ki9CFiTpwR6vcSZ6H7A'}
];
const DRIVE_FOLDER_BASE='https://drive.google.com/drive/folders/';

const FALLBACK_NAMES={
  etica:'Ética Profissional',constitucional:'Direito Constitucional',penal:'Direito Penal','processo-penal':'Processo Penal',
  tributario:'Direito Tributário',administrativo:'Direito Administrativo',civil:'Direito Civil','processo-civil':'Processo Civil',
  empresarial:'Direito Empresarial',trabalho:'Direito do Trabalho','processo-trabalho':'Processo do Trabalho',eleitoral:'Direito Eleitoral',
  financeiro:'Direito Financeiro',humanos:'Direitos Humanos',eca:'ECA',consumidor:'Direito do Consumidor',previdenciario:'Direito Previdenciário',
  ambiental:'Direito Ambiental',internacional:'Direito Internacional',filosofia:'Filosofia do Direito'
};

function key(id){return id.replace(/-/g,'_');}
function topicsFor(id){return (MATERIALS.topicCatalog?.[key(id)]?.items||[]).map(x=>x.label);}
function driveUrl(id){return `${DRIVE_FOLDER_BASE}${encodeURIComponent(id)}?usp=drive_link`;}
function resourceLabel(kind){return ({curso:'Curso',aula:'Aulas',resumo:'Resumo',mapa:'Mapa mental',legislacao:'Caderno legislativo',pdf:'PDF',acervo:'Acervo'}[kind]||'Material');}
function resourceClass(kind){return ['curso','aula'].includes(kind)?'btn primary':'btn secondary';}
function subjectEntries(){
  const catalogRows=Object.entries(CATALOG.subjects||{}).map(([id,row])=>({id,name:row.name||FALLBACK_NAMES[id]||id,resources:row.resources||[]}));
  const known=new Set(catalogRows.map(x=>x.id));
  SUBJECTS.forEach(s=>{if(!known.has(s.id)&&FALLBACK_NAMES[s.id])catalogRows.push({id:s.id,name:s.name||FALLBACK_NAMES[s.id],resources:[]});});
  return catalogRows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

const folders=subjectEntries();

function populate(){
  const params=new URLSearchParams(location.search);
  const sel=$('subjectFilter');
  sel.innerHTML='<option value="all">Todas as matérias</option>'+folders.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
  const requested=params.get('subject');
  if(requested&&folders.some(f=>f.id===requested))sel.value=requested;
  const q=params.get('q');
  if(q)$('search').value=q;
}

function renderCollections(){
  const box=$('collections');
  if(!box)return;
  const rows=CATALOG.collections||[];
  box.innerHTML=rows.map(r=>`<a class="collection" target="_blank" rel="noopener noreferrer" href="${driveUrl(r.id)}">
    <span>${esc(r.source)}</span><strong>${esc(r.label)}</strong><small>${esc(r.note||'Abrir no Drive')}</small>
  </a>`).join('');
}

function studyPrescription(resources){
  const kinds=new Set(resources.map(r=>r.kind));
  if(kinds.has('resumo')&&kinds.has('mapa')&&kinds.has('legislacao'))return 'Use aula quando houver lacuna; resumo/mapa para consolidar; caderno legislativo para fechar a regra na fonte.';
  if(kinds.has('curso')&&kinds.has('pdf'))return 'Curso para aprender; apostila/mapa para consolidar; depois volte às questões sem consulta.';
  if(kinds.has('curso'))return 'Abra o curso somente quando a questão revelar lacuna de conteúdo; depois retorne imediatamente ao treino.';
  return 'Use o material como apoio pontual e volte às questões para validar retenção.';
}

function render(){
  const q=norm($('search').value),subject=$('subjectFilter').value;
  const rows=folders.filter(f=>{
    if(subject!=='all')return f.id===subject;
    const hay=norm(`${f.name} ${topicsFor(f.id).join(' ')} ${(f.resources||[]).map(r=>`${r.label} ${r.source}`).join(' ')}`);
    return !q||hay.includes(q);
  });
  $('library').innerHTML=rows.length?rows.map(f=>{
    const topics=topicsFor(f.id).slice(0,10),resources=f.resources||[];
    return `<article class="course">
      <div class="course-head"><div><p class="eyebrow">${esc(resources.length?`${resources.length} ROTAS DE ESTUDO`:'ACERVO')}</p><h3>${esc(f.name)}</h3></div><span class="source-count">${resources.length||'—'}</span></div>
      <p>${esc(studyPrescription(resources))}</p>
      ${topics.length?`<div class="tags">${topics.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
      <div class="resource-list">${resources.map(r=>`<div class="resource-row"><div><small>${esc(r.source)}</small><strong>${esc(r.label)}</strong></div><a class="${resourceClass(r.kind)} compact" target="_blank" rel="noopener noreferrer" href="${driveUrl(r.id)}">${esc(resourceLabel(r.kind))}</a></div>`).join('')||'<div class="muted">Material específico ainda não indexado no backup atual.</div>'}</div>
      <div class="course-actions"><a class="text-btn" href="questao-guiada.html?subject=${encodeURIComponent(f.id)}">Treinar esta matéria →</a></div>
    </article>`;
  }).join(''):'<div class="empty">Nenhuma matéria ou tema corresponde ao filtro.</div>';
}

populate();
renderCollections();
$('search').oninput=render;
$('subjectFilter').onchange=render;
render();
