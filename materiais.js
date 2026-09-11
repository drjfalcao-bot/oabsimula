import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const ROOT_KEY='oab-aprova-private-material-root-v1';
const CATALOG_KEY='oab-aprova-private-video-catalog-v2';
const PAGE=new URLSearchParams(location.search);
const INITIAL_SUBJECT=PAGE.get('subject')||'all';
const INITIAL_QUERY=PAGE.get('q')||'';
const $=id=>document.getElementById(id);
const I=window.OAB_INTELLIGENCE||null;
const SUBJECTS=window.OAB_SUBJECTS||[];
const app=getApps()[0]||initializeApp(window.OAB_FIREBASE_CONFIG);
const auth=getAuth(app);
const db=getFirestore(app);
let accessToken=null,currentUser=null,catalog=readJson(CATALOG_KEY,[]),preferredSubject=INITIAL_SUBJECT,scanBusy=false;

const subjectAliases={etica:['ética','etica'],constitucional:['constitucional'],penal:['direito penal','d. penal','d penal','penal'],'processo-penal':['processo penal','p. penal','p penal'],tributario:['tributário','tributario'],trabalho:['direito do trabalho','d. do trabalho','d do trabalho'],'processo-trabalho':['processo do trabalho','p. do trabalho','p do trabalho'],civil:['direito civil','d. civil','d civil'],'processo-civil':['processo civil','p. civil','p civil'],administrativo:['administrativo'],empresarial:['empresarial'],eleitoral:['eleitoral'],financeiro:['financeiro'],previdenciario:['previdenciário','previdenciario'],humanos:['direitos humanos','d. humanos','d humanos','humanos'],consumidor:['consumidor'],eca:['criança e do adolescente','crianca e do adolescente','eca'],ambiental:['ambiental'],internacional:['internacional'],filosofia:['filosofia']};
const VIDEO_EXT=/\.(mp4|m4v|mov|webm|mkv|avi)$/i;
function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback;}catch{return fallback;}}
function writeCatalog(){localStorage.setItem(CATALOG_KEY,JSON.stringify(catalog));render();}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function parseFolderId(value){const s=String(value||'').trim();if(!s)return null;const m=s.match(/\/folders\/([A-Za-z0-9_-]+)/);if(m)return m[1];return /^[A-Za-z0-9_-]{15,}$/.test(s)?s:null;}
function starsFromName(name){return Math.min(3,(String(name).match(/⭐/g)||[]).length);}
function cleanTitle(name){return String(name||'').replace(/\.(mp4|m4v|mov|webm|mkv|avi)$/i,'').replace(/⭐/g,'').replace(/\s+/g,' ').trim();}
function sizeLabel(v){const n=Number(v||0);if(!n)return '—';if(n>1073741824)return `${(n/1073741824).toFixed(1)} GB`;return `${Math.round(n/1048576)} MB`;}
function inferSubject(path,name=''){const text=norm(`${path.join(' ')} ${name}`),order=['processo-trabalho','processo-penal','processo-civil','previdenciario','constitucional','administrativo','empresarial','tributario','financeiro','eleitoral','consumidor','internacional','ambiental','filosofia','humanos','eca','trabalho','penal','civil','etica'];for(const id of order){if((subjectAliases[id]||[]).some(a=>text.includes(norm(a))))return id;}return null;}
function subjectName(id){return SUBJECTS.find(s=>s.id===id)?.name||I?.SUBJECTS?.[id]?.name||id||'Não classificada';}
function mappedTopic(item){if(!I||!item.subject)return null;try{return I.resolveTopic(item.subject,item.title);}catch{return null;}}
function isTheoryFolder(name){const n=norm(name);return n.includes('aulas teor')||n.includes('aula teor');}
function isVideoFile(f){return String(f.mimeType||'').startsWith('video/')||VIDEO_EXT.test(String(f.name||''))||['mp4','m4v','mov','webm','mkv','avi'].includes(String(f.fileExtension||'').toLowerCase());}
function setStatus(text){$('status').textContent=text;}
function setBusy(busy,label='Localizando aulas…'){scanBusy=busy;const a=$('autoScanDrive'),m=$('scanDrive');if(a){a.disabled=busy;a.textContent=busy?label:'Localizar minhas aulas automaticamente';}if(m)m.disabled=busy;}

async function authorizeDrive(){
  const provider=new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  provider.setCustomParameters({prompt:'consent',include_granted_scopes:'true'});
  const result=await signInWithPopup(auth,provider),credential=GoogleAuthProvider.credentialFromResult(result);
  accessToken=credential?.accessToken||null;
  if(!accessToken)throw new Error('O Google não devolveu acesso ao Drive. Autorize novamente e aceite a permissão de leitura.');
  $('connectDrive').textContent='Drive autorizado nesta sessão';
  $('disconnectDrive').classList.remove('hidden');
  setStatus('Drive autorizado. Localizando automaticamente as pastas de aulas teóricas…');
}
async function driveList(q){
  if(!accessToken)throw new Error('Autorize o Google Drive nesta sessão.');
  const out=[];let pageToken='';
  do{
    const params=new URLSearchParams({q,pageSize:'1000',fields:'nextPageToken,files(id,name,mimeType,size,webViewLink,fileExtension,parents)',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
    if(pageToken)params.set('pageToken',pageToken);
    const r=await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(r.status===401)throw new Error('A autorização do Drive expirou. Clique em Autorizar Google Drive novamente.');
    if(r.status===403){let detail='';try{const j=await r.json();detail=j?.error?.message||'';}catch{}throw new Error(`O Google bloqueou a leitura do Drive.${detail?` ${detail}`:''}`);}
    if(!r.ok)throw new Error(`Falha ao consultar o Drive (${r.status}).`);
    const json=await r.json();out.push(...(json.files||[]));pageToken=json.nextPageToken||'';
  }while(pageToken);
  return out;
}
async function driveChildren(parentId){return driveList(`'${String(parentId).replace(/'/g,"\\'")}' in parents and trashed=false`);}
async function discoverTheoryFolders(){
  setStatus('Procurando pastas “Aulas Teóricas” no Drive…');
  const candidates=await driveList("mimeType='application/vnd.google-apps.folder' and trashed=false and name contains 'Aulas'");
  const folders=candidates.filter(f=>isTheoryFolder(f.name));
  const seen=new Set();
  return folders.filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true;});
}
async function scanTheoryFolder(folder){
  const baseSubject=inferSubject([folder.name]);
  const queue=[{id:folder.id,path:[folder.name],depth:0}],visited=new Set(),videos=[];
  while(queue.length){
    const node=queue.shift();if(visited.has(node.id)||node.depth>4)continue;visited.add(node.id);
    const children=await driveChildren(node.id);
    for(const f of children){
      if(f.mimeType==='application/vnd.google-apps.folder')queue.push({id:f.id,path:[...node.path,f.name],depth:node.depth+1});
      else if(isVideoFile(f))videos.push({id:f.id,title:cleanTitle(f.name),subject:inferSubject(node.path,f.name)||baseSubject,stars:starsFromName(f.name),size:Number(f.size||0),webViewLink:f.webViewLink||`https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,path:node.path.join(' › '),scannedAt:Date.now()});
    }
  }
  return videos;
}
async function autoScan(){
  if(scanBusy)return;
  if(!accessToken){await authorizeDrive();}
  setBusy(true);
  try{
    const folders=await discoverTheoryFolders();
    if(!folders.length)throw new Error('Nenhuma pasta com nome “Aulas Teóricas” foi encontrada na conta autorizada. Confirme se autorizou a mesma conta em que estão CEISC/VDE.');
    const all=[];
    for(let i=0;i<folders.length;i++){
      const f=folders[i];setStatus(`Indexando ${i+1}/${folders.length}: ${f.name} • ${all.length} vídeo(s) encontrados…`);
      all.push(...await scanTheoryFolder(f));
    }
    const unique=new Map(all.map(v=>[v.id,v]));
    catalog=[...unique.values()].sort((a,b)=>String(subjectName(a.subject)).localeCompare(subjectName(b.subject),'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
    writeCatalog();
    setStatus(`Pronto: ${catalog.length} videoaula(s) encontradas em ${folders.length} pasta(s) de aulas teóricas. O catálogo fica somente neste navegador.`);
  }finally{setBusy(false);}
}
async function scanRoot(rootId){
  const queue=[{id:rootId,path:[],depth:0}],visited=new Set(),videos=[];
  while(queue.length){
    const node=queue.shift();if(visited.has(node.id)||node.depth>7)continue;visited.add(node.id);setStatus(`Escaneando pasta escolhida… ${visited.size} pasta(s), ${videos.length} vídeo(s).`);
    const children=await driveChildren(node.id);
    for(const f of children){
      if(f.mimeType==='application/vnd.google-apps.folder')queue.push({id:f.id,path:[...node.path,f.name],depth:node.depth+1});
      else if(isVideoFile(f)){const theory=node.path.some(isTheoryFolder);if(!theory)continue;videos.push({id:f.id,title:cleanTitle(f.name),subject:inferSubject(node.path,f.name),stars:starsFromName(f.name),size:Number(f.size||0),webViewLink:f.webViewLink||`https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,path:node.path.join(' › '),scannedAt:Date.now()});}
    }
  }
  return videos;
}
async function savePrivateRoot(rootId){localStorage.setItem(ROOT_KEY,rootId);if(currentUser){try{await setDoc(doc(db,'users',currentUser.uid,'materials','config'),{rootFolderId:rootId,updatedAt:Date.now()},{merge:true});}catch{}}}
async function loadPrivateRoot(){let root=localStorage.getItem(ROOT_KEY)||'';if(currentUser){try{const snap=await getDoc(doc(db,'users',currentUser.uid,'materials','config'));if(snap.exists()&&snap.data()?.rootFolderId)root=String(snap.data().rootFolderId);}catch{}}if(root)$('rootFolder').value=root;}
function populateSubjectFilter(){const el=$('subjectFilter'),current=el.value&&el.value!=='all'?el.value:preferredSubject,ids=[...new Set(catalog.map(x=>x.subject).filter(Boolean))];el.innerHTML='<option value="all">Todas as matérias</option>'+ids.map(id=>`<option value="${esc(id)}">${esc(subjectName(id))}</option>`).join('');if([...el.options].some(o=>o.value===current))el.value=current;else el.value='all';}
function render(){
  populateSubjectFilter();const q=norm($('search')?.value||''),subject=$('subjectFilter')?.value||'all',rows=catalog.filter(v=>(subject==='all'||v.subject===subject)&&(!q||norm(`${v.title} ${subjectName(v.subject)} ${v.path}`).includes(q))),mapped=catalog.filter(v=>mappedTopic(v)).length;
  $('mVideos').textContent=String(catalog.length);$('mSubjects').textContent=String(new Set(catalog.map(v=>v.subject).filter(Boolean)).size);$('mMapped').textContent=catalog.length?`${Math.round(mapped/catalog.length*100)}%`:'0%';$('scanBadge').textContent=catalog.length?`${catalog.length} aulas indexadas`:'sem catálogo';
  $('library').innerHTML=rows.length?rows.map(v=>{const t=mappedTopic(v);return `<article class="video"><div><h3>${esc(v.title)}</h3><p>${esc(subjectName(v.subject))}${v.path?` • ${esc(v.path)}`:''} • ${sizeLabel(v.size)}</p><div class="tags">${v.stars?`<span class="tag gold">${'★'.repeat(v.stars)}</span>`:''}${t?`<span class="tag">${esc(t.label)}</span><span class="tag">${Math.round(t.historicalShare*100)}% histórico da matéria</span>`:'<span class="tag">tema ainda não mapeado</span>'}</div></div><div class="video-actions"><button class="btn secondary" data-play="${esc(v.id)}">Assistir</button>${v.webViewLink?`<a class="btn secondary" href="${esc(v.webViewLink)}" target="_blank" rel="noopener noreferrer">Abrir no Drive</a>`:''}</div></article>`}).join(''):'<div class="empty">${catalog.length?'Nenhuma aula corresponde ao filtro atual.':'Nenhuma aula carregada ainda. Clique em “Localizar minhas aulas automaticamente”.'}</div>';
  document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>openVideo(b.dataset.play));
}
function openVideo(id){const v=catalog.find(x=>x.id===id);if(!v)return;$('modalTitle').textContent=v.title;$('videoFrame').src=`https://drive.google.com/file/d/${encodeURIComponent(v.id)}/preview`;$('videoModal').classList.remove('hidden');}
function closeVideo(){$('videoFrame').src='about:blank';$('videoModal').classList.add('hidden');}

$('search').value=INITIAL_QUERY;
$('connectDrive').onclick=async()=>{try{await authorizeDrive();await loadPrivateRoot();await autoScan();}catch(e){setStatus(e?.message||String(e));setBusy(false);}};
$('autoScanDrive').onclick=async()=>{try{await autoScan();}catch(e){setStatus(e?.message||String(e));setBusy(false);}};
$('disconnectDrive').onclick=async()=>{accessToken=null;try{await signOut(auth);}catch{}$('connectDrive').textContent='Autorizar Google Drive';$('disconnectDrive').classList.add('hidden');setStatus('Sessão do Drive desconectada. O catálogo local foi preservado.');};
$('scanDrive').onclick=async()=>{const rootId=parseFolderId($('rootFolder').value);if(!rootId){setStatus('Informe uma URL ou ID válido da pasta raiz.');return;}try{if(!accessToken)await authorizeDrive();setBusy(true,'Escaneando pasta…');await savePrivateRoot(rootId);catalog=await scanRoot(rootId);writeCatalog();setStatus(`Importação manual concluída: ${catalog.length} videoaula(s) indexadas.`);}catch(e){setStatus(e?.message||String(e));}finally{setBusy(false);}};
$('search').oninput=render;$('subjectFilter').onchange=()=>{preferredSubject=$('subjectFilter').value;render();};$('closeModal').onclick=closeVideo;$('videoModal').onclick=e=>{if(e.target===$('videoModal'))closeVideo();};
onAuthStateChanged(auth,async user=>{currentUser=user;if(user)await loadPrivateRoot();});loadPrivateRoot();render();
