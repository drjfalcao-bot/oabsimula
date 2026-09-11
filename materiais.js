const SUBJECTS=window.OAB_SUBJECTS||[];
const MATERIALS=window.OAB_LEARNING_MATERIALS||{};
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const folders=[
{id:'etica',name:'Ética Profissional',folder:'12gZ_cpUGbYPyTjdeWPPztPT58NAkn1yf'},
{id:'constitucional',name:'Direito Constitucional',folder:'1VevNLk8p4IbZVhad0Sn3E1vacyfLUy88'},
{id:'penal',name:'Direito Penal',folder:'1LeOIYkHy_eA1gCbBfdfTO3BZVAZ2v_RG'},
{id:'processo-penal',name:'Processo Penal',folder:'1HL2bJYDYasK6PHtDpVx7fnzy5ZBZmJnK'},
{id:'tributario',name:'Direito Tributário',folder:'1Rhaf8D_AVeOFfI7t8bSv1ZCrdfIlt69W'},
{id:'administrativo',name:'Direito Administrativo',folder:'1NadCZPuyxG1mqK3mAn125TkbU2q3V0bs'},
{id:'civil',name:'Direito Civil',folder:'1b3YUByQF6jlv-24QZf7cBOz9OKic_gmd'},
{id:'processo-civil',name:'Processo Civil',folder:'1UOqqi1fKeUZ9MzhXYHTxt1XfMyJRFsLg'},
{id:'empresarial',name:'Direito Empresarial',folder:'1nHtUO3cl2z8efUcciQnUjB_F-ujL4CdX'},
{id:'trabalho',name:'Direito do Trabalho',folder:'1MTxd1Fi6smCUdUwU3nkVIlAfSD1GbFGd'},
{id:'processo-trabalho',name:'Processo do Trabalho',folder:'1U-6S3edyUee8CsH6EnWT131bGm1g-4Ct'},
{id:'eleitoral',name:'Direito Eleitoral',folder:'1vszlAw7jCcXlnDhJlXQxRNhjWPLSwhwK'},
{id:'financeiro',name:'Direito Financeiro',folder:'1raf-ScZwcP6WIwZDu3_DTxt8QscWNI_E'},
{id:'humanos',name:'Direitos Humanos',folder:'1Q1cDEMXkiMFsdR-V3bV80iyASPvw8DCi'},
{id:'eca',name:'ECA',folder:'1O-gGBQ49R0Qa2ihzcUF1-L5pEhIakAnq'},
{id:'consumidor',name:'Direito do Consumidor',folder:'16MbGX7E1qKCot-8lGYSv3jBLcJh0FSus'},
{id:'ambiental',name:'Direito Ambiental',folder:'1DSCyD1riojezakflHtEONUDF5dmKUEEB'},
{id:'internacional',name:'Direito Internacional',folder:'1FrPblXlznLaht2rqvG1QyC55ZltRmlxj'},
{id:'previdenciario',name:'Direito Previdenciário',folder:'1i6xg4u46CfMQJO1aAPOZpMtJ1kbvVeXO'},
{id:'filosofia',name:'Filosofia do Direito',folder:'1m5G-g-MG8YCF3Ki9CFiTpwR6vcSZ6H7A'}
];
function key(id){return id.replace(/-/g,'_');}
function topicsFor(id){return (MATERIALS.topicCatalog?.[key(id)]?.items||[]).slice(0,6).map(x=>x.label);}
function driveUrl(f){return `https://drive.google.com/drive/folders/${encodeURIComponent(f.folder)}`;}
function embedUrl(f){return `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(f.folder)}#list`;}
function populate(){const sel=$('subjectFilter');sel.innerHTML='<option value="all">Todas as matérias</option>'+folders.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');const requested=new URLSearchParams(location.search).get('subject');if(requested&&folders.some(f=>f.id===requested))sel.value=requested;}
function render(){const q=norm($('search').value),subject=$('subjectFilter').value;const rows=folders.filter(f=>(subject==='all'||f.id===subject)&&(!q||norm(`${f.name} ${topicsFor(f.id).join(' ')}`).includes(q)));$('library').innerHTML=rows.length?rows.map(f=>{const topics=topicsFor(f.id);return `<article class="course"><div><p class="eyebrow">VIDEOAULAS</p><h3>${f.name}</h3><p>Pasta original do Google Drive. O conteúdo permanece atualizado conforme a pasta muda.</p></div><div class="tags">${topics.map(t=>`<span class="tag">${t}</span>`).join('')}</div><div class="course-actions"><button class="btn primary" data-view="${f.id}">Ver aulas</button><a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${driveUrl(f)}">Abrir no Drive</a></div></article>`}).join(''):'<div class="empty">Nenhuma matéria corresponde ao filtro.</div>';document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openViewer(b.dataset.view));}
function openViewer(id){const f=folders.find(x=>x.id===id);if(!f)return;$('viewerTitle').textContent=f.name;$('viewerDrive').href=driveUrl(f);$('viewerFrame').src=embedUrl(f);$('viewer').classList.remove('hidden');}
function closeViewer(){$('viewerFrame').src='about:blank';$('viewer').classList.add('hidden');}
populate();$('search').oninput=render;$('subjectFilter').onchange=render;$('viewerClose').onclick=closeViewer;$('viewer').onclick=e=>{if(e.target===$('viewer'))closeViewer();};render();