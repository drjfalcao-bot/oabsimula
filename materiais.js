import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const ROOT_KEY='oab-aprova-private-material-root-v1';
const CATALOG_KEY='oab-aprova-private-video-catalog-v1';
const $=id=>document.getElementById(id);
const I=window.OAB_INTELLIGENCE||null;
const SUBJECTS=window.OAB_SUBJECTS||[];
const app=getApps()[0]||initializeApp(window.OAB_FIREBASE_CONFIG);
const auth=getAuth(app);
const db=getFirestore(app);
let accessToken=null;
let currentUser=null;
let catalog=readJson(CATALOG_KEY,[]);

const subjectAliases={
  etica:['ética','etica'],constitucional:['constitucional'],penal:['penal'],
  'processo-penal':['processo penal','p. penal','p penal'],tributario:['tributário','tributario'],
  trabalho:['direito do trabalho','trabalho'], 'processo-trabalho':['processo do trabalho','p. do trabalho','p do trabalho'],
  civil:['direito civil','civil'],'processo-civil':['processo civil','p. civil','p civil'],
  administrativo:['administrativo'],empresarial:['empresarial'],eleitoral:['eleitoral'],financeiro:['financeiro'],
  previdenciario:['previdenciário','previdenciario'],humanos:['direitos humanos','d. humanos','humanos'],
  consumidor:['consumidor'],eca:['criança e do adolescente','crianca e do adolescente','eca'],ambiental:['ambiental'],internacional:['internacional'],filosofia:['filosofia']
};

function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback;}catch{return fallback;}}
function writeCatalog(){localStorage.setItem(CATALOG_KEY,JSON.stringify(catalog));render();}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function parseFolderId(value){const s=String(value||'').trim();if(!s)return null;const m=s.match(/\/folders\/([A-Za-z0-9_-]+)/);if(m)return m[1];return /^[A-Za-z0-9_-]{15,}$/.test(s)?s:null;}
function starsFromName(name){return Math.min(3,(String(name).match(/⭐/g)||[]).length);}
function cleanTitle(name){return String(name||'').replace(/\.mp4$/i,'').replace(/⭐/g,'').replace(/\s+/g,' ').trim();}
function sizeLabel(v){const n=Number(v||0);if(!n)return '—';if(n>1073741824)return `${(n/1073741824).toFixed(1)} GB`;return `${Math.round(n/1048576)} MB`;}
function inferSubject(path,name=''){
  const text=norm(`${path.join(' ')} ${name}`);
  const order=['processo-trabalho','processo-penal','processo-civil','previdenciario','constitucional','administrativo','empresarial','tributario','financeiro','eleitoral','consumidor','internacional','ambiental','filosofia','humanos','eca','trabalho','penal','civil','etica'];
  for(const id of order){if((subjectAliases[id]||[]).some(a=>text.includes(norm(a))))return id;}
  return null;
}
function subjectName(id){return SUBJECTS.find(s=>s.id===id)?.name||I?.SUBJECTS?.[id]?.name||id||'Não classificada';}
function mappedTopic(item){if(!I||!item.subject)return null;try{return I.resolveTopic(item.subject,item.title);}catch{return null;}}

async function authorizeDrive(){
  const provider=new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  provider.setCustomParameters({prompt:'consent',include_granted_scopes:'true'});
  const result=await signInWithPopup(auth,provider);
  const credential=GoogleAuthProvider.credentialFromResult(result);
  accessToken=credential?.accessToken||null;
  if(!accessToken)throw new Error('O Google não devolveu um token com acesso ao Drive.');
  $('connectDrive').textContent='Drive autorizado nesta sessão';
  $('disconnectDrive').classList.remove('hidden');
  $('status').textContent='Drive autorizado. Agora escaneie a pasta raiz do curso.';
}

async function driveChildren(parentId){
  if(!accessToken)throw new Error('Autorize o Google Drive nesta sessão.');
  const out=[];let pageToken='';
  do{
    const q=`'${parentId.replace(/'/g,"\\'")}' in parents and trashed=false`;
    const params=new URLSearchParams({q,pageSize:'1000',fields:'nextPageToken,files(id,name,mimeType,size,webViewLink)',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
    if(pageToken)params.set('pageToken',pageToken);
    const r=await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(r.status===401||r.status===403)throw new Error('A autorização do Drive expirou ou não possui permissão. Autorize novamente.');
    if(!r.ok)throw new Error(`Falha ao consultar o Drive (${r.status}).`);
    const json=await r.json();out.push(...(json.files||[]));pageToken=json.nextPageToken||'';
  }while(pageToken);
  return out;
}

async function scanRoot(rootId){
  const queue=[{id:rootId,path:[],depth:0}];
  const visited=new Set();const videos=[];
  while(queue.length){
    const node=queue.shift();if(visited.has(node.id)||node.depth>5)continue;visited.add(node.id);
    $('status').textContent=`Escaneando o acervo… ${visited.size} pasta(s) verificadas, ${videos.length} vídeo(s) encontrados.`;
    const children=await driveChildren(node.id);
    for(const f of children){
      if(f.mimeType==='application/vnd.google-apps.folder'){
        const path=[...node.path,f.name];
        const n=norm(f.name);
        const useful=node.depth<2||n.includes('aulas teor')||n.includes('aula teor')||n.includes('teoricas')||n.includes('teorica')||inferSubject(path);
        if(useful)queue.push({id:f.id,path,depth:node.depth+1});
      }else if(String(f.mimeType||'').startsWith('video/')){
        const path=node.path;
        const inTheory=path.some(p=>{const n=norm(p);return n.includes('aulas teor')||n.includes('aula teor')||n.includes('teoricas')||n.includes('teorica');});
        if(!inTheory)continue;
        const subject=inferSubject(path,f.name);
        const title=cleanTitle(f.name);
        videos.push({id:f.id,title,subject,stars:starsFromName(f.name),size:Number(f.size||0),webViewLink:f.webViewLink||null,path:path.join(' › '),scannedAt:Date.now()});
      }
    }
  }
  return videos.sort((a,b)=>String(subjectName(a.subject)).localeCompare(subjectName(b.subject),'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
}

async function savePrivateRoot(rootId){
  localStorage.setItem(ROOT_KEY,rootId);
  if(currentUser){try{await setDoc(doc(db,'users',currentUser.uid,'materials','config'),{rootFolderId:rootId,updatedAt:Date.now()},{merge:true});}catch{}}
}
async function loadPrivateRoot(){
  let root=localStorage.getItem(ROOT_KEY)||'';
  if(currentUser){try{const snap=await getDoc(doc(db,'users',currentUser.uid,'materials','config'));if(snap.exists()&&snap.data()?.rootFolderId)root=String(snap.data().rootFolderId);}catch{}}
  if(root)$('rootFolder').value=root;
}

function populateSubjectFilter(){
  const ids=[...new Set(catalog.map(x=>x.subject).filter(Boolean))];
  $('subjectFilter').innerHTML='<option value="all">Todas as matérias</option>'+ids.map(id=>`<option value="${esc(id)}">${esc(subjectName(id))}</option>`).join('');
}
function render(){
  populateSubjectFilter();
  const q=norm($('search')?.value||''),subject=$('subjectFilter')?.value||'all';
  const rows=catalog.filter(v=>(subject==='all'||v.subject===subject)&&(!q||norm(`${v.title} ${subjectName(v.subject)} ${v.path}`).includes(q)));
  const mapped=catalog.filter(v=>mappedTopic(v)).length;
  $('mVideos').textContent=String(catalog.length);
  $('mSubjects').textContent=String(new Set(catalog.map(v=>v.subject).filter(Boolean)).size);
  $('mMapped').textContent=catalog.length?`${Math.round(mapped/catalog.length*100)}%`:'0%';
  $('scanBadge').textContent=catalog.length?`${catalog.length} aulas locais`:'sem catálogo';
  $('library').innerHTML=rows.length?rows.map(v=>{const t=mappedTopic(v);return `<article class="video"><div><h3>${esc(v.title)}</h3><p>${esc(subjectName(v.subject))}${v.path?` • ${esc(v.path)}`:''} • ${sizeLabel(v.size)}</p><div class="tags">${v.stars?`<span class="tag gold">${'★'.repeat(v.stars)}</span>`:''}${t?`<span class="tag">${esc(t.label)}</span><span class="tag">${Math.round(t.historicalShare*100)}% histórico da matéria</span>`:'<span class="tag">tema ainda não mapeado</span>'}</div></div><div class="video-actions"><button class="btn secondary" data-play="${esc(v.id)}">Assistir</button>${v.webViewLink?`<a class="btn secondary" href="${esc(v.webViewLink)}" target="_blank" rel="noopener noreferrer">Abrir no Drive</a>`:''}</div></article>`}).join(''):'<div class="empty">Nenhuma aula corresponde ao filtro atual.</div>';
  document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>openVideo(b.dataset.play));
}
function openVideo(id){const v=catalog.find(x=>x.id===id);if(!v)return;$('modalTitle').textContent=v.title;$('videoFrame').src=`https://drive.google.com/file/d/${encodeURIComponent(v.id)}/preview`;$('videoModal').classList.remove('hidden');}
function closeVideo(){$('videoFrame').src='about:blank';$('videoModal').classList.add('hidden');}

$('connectDrive').onclick=async()=>{try{await authorizeDrive();await loadPrivateRoot();}catch(e){$('status').textContent=e?.message||String(e);}};
$('disconnectDrive').onclick=async()=>{accessToken=null;try{await signOut(auth);}catch{}$('connectDrive').textContent='Autorizar Google Drive';$('disconnectDrive').classList.add('hidden');$('status').textContent='Sessão do Drive desconectada. O catálogo local foi preservado.';};
$('scanDrive').onclick=async()=>{
  const rootId=parseFolderId($('rootFolder').value);if(!rootId){$('status').textContent='Informe uma URL ou ID válido da pasta raiz.';return;}
  if(!accessToken){$('status').textContent='Primeiro autorize o Google Drive nesta sessão.';return;}
  const b=$('scanDrive');b.disabled=true;b.textContent='Escaneando…';
  try{await savePrivateRoot(rootId);catalog=await scanRoot(rootId);writeCatalog();$('status').textContent=`Importação concluída: ${catalog.length} aula(s) teórica(s) indexadas sem publicar o acervo.`;}
  catch(e){$('status').textContent=e?.message||String(e);}finally{b.disabled=false;b.textContent='Escanear aulas teóricas';}
};
$('search').oninput=render;$('subjectFilter').onchange=render;$('closeModal').onclick=closeVideo;$('videoModal').onclick=e=>{if(e.target===$('videoModal'))closeVideo();};

onAuthStateChanged(auth,async user=>{currentUser=user;if(user)await loadPrivateRoot();});
loadPrivateRoot();render();
