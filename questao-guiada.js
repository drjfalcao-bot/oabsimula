import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';
import { getAllQuestions, getQuestionBankBreakdown } from './question-bank.js';

const STORAGE_KEY='oab-aprova-premium-v1';
const COMMENT_CACHE_KEY='oab-aprova-guided-comments-v1';
const DAY=86400000;
const $=id=>document.getElementById(id);
const SUBJECTS=window.OAB_SUBJECTS||[];
const CORE=new Set(SUBJECTS.filter(s=>s.core).map(s=>s.id));
const subjectName=id=>SUBJECTS.find(s=>s.id===id)?.name||id||'Geral';
const now=()=>Date.now();
let QUESTIONS=[];
let breakdown=null;
let current=null;
let currentAnswered=null;
let questionStartedAt=now();
let state=loadState();
let commentCache=loadCommentCache();
let auth=null,db=null,tutor=null,currentUser=null;

function defaultState(){return {version:2,profile:{name:'Usuário local'},attempts:[],reviews:{},sessions:[],settings:{},guided:{seen:{},answered:0,correct:0},updatedAt:now()};}
function normalizeState(raw){
  const base=defaultState(), s={...base,...(raw||{})};
  s.profile={...base.profile,...(raw?.profile||{})};
  s.settings={...base.settings,...(raw?.settings||{})};
  s.attempts=Array.isArray(raw?.attempts)?raw.attempts:[];
  s.reviews=raw?.reviews&&typeof raw.reviews==='object'?raw.reviews:{};
  s.sessions=Array.isArray(raw?.sessions)?raw.sessions:[];
  s.guided={seen:{},answered:0,correct:0,...(raw?.guided||{})};
  s.guided.seen=s.guided.seen&&typeof s.guided.seen==='object'?s.guided.seen:{};
  return s;
}
function loadState(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}catch{return defaultState();}}
function persistState({cloud=true}={}){
  state.updatedAt=now();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  renderStats();
  if(cloud&&currentUser&&db)setDoc(doc(db,'users',currentUser.uid,'state','main'),state).then(()=>{$('syncStatus').textContent='Sincronizado com a nuvem';}).catch(()=>{$('syncStatus').textContent='Salvo localmente • nuvem indisponível';});
}
function loadCommentCache(){try{const v=JSON.parse(localStorage.getItem(COMMENT_CACHE_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
function saveCommentCache(){
  const entries=Object.entries(commentCache).sort((a,b)=>(b[1]?.ts||0)-(a[1]?.ts||0)).slice(0,250);
  commentCache=Object.fromEntries(entries);localStorage.setItem(COMMENT_CACHE_KEY,JSON.stringify(commentCache));
}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function isOfficial(q){return Boolean(q?.official||q?.origin==='official-fgv'||q?.sourceType==='fgv-official');}
function letter(i){return String.fromCharCode(65+Number(i||0));}
function showNotice(msg){$('notice').textContent=msg;$('notice').classList.remove('hidden');setTimeout(()=>$('notice').classList.add('hidden'),4500);}

function decisiveWords(text){
  const patterns=['incorreta','correta','exceto','não','apenas','somente','salvo','vedado','permitido','poderá','deverá','obrigatório','facultativo','prazo','competência','legitimidade','cabível','efeito'];
  const lower=String(text||'').toLowerCase();
  return patterns.filter(w=>lower.includes(w)).slice(0,7);
}
function inferCommand(text){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  const sentences=clean.split(/(?<=[?.!])\s+/).filter(Boolean);
  const explicit=[...sentences].reverse().find(s=>/(assinale|indique|marque|alternativa|afirmativa|é correto|é incorreto|pode|deve|deverá|poderá|qual)/i.test(s));
  return explicit||sentences.at(-1)||clean.slice(-260);
}
function fallbackAnalysis(q){
  const words=decisiveWords(q.text);
  const explanation=String(q.explanation||'O gabarito do item foi preservado, mas este registro não possui comentário editorial individualizado suficiente.').trim();
  const concept=String(q.topic||subjectName(q.subject)).replace(/\s*•\s*prova oficial/ig,'').trim();
  return {
    command:inferCommand(q.text),
    decisiveWords:words,
    concept:`${concept}. Antes de olhar o gabarito, identifique sujeito, competência, requisito, prazo, exceção e efeito jurídico que o caso está testando.`,
    trap:isOfficial(q)?'Em prova FGV, o distrator normalmente preserva grande parte da regra e altera um requisito, exceção, competência, prazo ou efeito. O comentário técnico individualiza esse desvio quando a IA está conectada.':'Compare cada distrator com a regra central indicada no comentário editorial; procure o detalhe jurídico que muda a conclusão.',
    alternatives:q.options.map((o,i)=>({letter:letter(i),status:i===q.correct?'certa':'errada',why:i===q.correct?explanation:'Distrator: esta alternativa não coincide com o gabarito. Use a análise técnica individualizada para localizar exatamente o requisito ou efeito jurídico que a invalida.'})),
    rule:explanation,
    memory:`Gabarito: ${letter(q.correct)}. Recupere a regra em uma frase e explique por que uma alternativa próxima está errada sem reler o comentário.`
  };
}
function safeUrl(v){try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}}
function sourceHtml(q){
  const sources=Array.isArray(q.sources)?q.sources:[];
  if(!sources.length&&q.source)return `<div class="source-list"><span>${esc(q.source)}</span></div>`;
  return `<div class="source-list">${sources.slice(0,4).map(s=>{const u=safeUrl(s.url);return u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.kind||'Fonte')}</a>`:`<span>${esc(s.title||s.kind||'Fonte')}</span>`}).join('')}</div>`;
}

function renderStats(){
  const guided=state.attempts.filter(a=>a.mode==='guided');
  const correct=guided.filter(a=>a.correct).length;
  $('bankTotal').textContent=(breakdown?.total??QUESTIONS.length)||'—';
  $('officialTotal').textContent=(breakdown?.official??QUESTIONS.filter(isOfficial).length)||'—';
  $('authorialTotal').textContent=(breakdown?Math.max(0,breakdown.total-(breakdown.official||0)):QUESTIONS.filter(q=>!isOfficial(q)).length)||'—';
  $('guidedAttempts').textContent=guided.length;
  $('guidedAccuracy').textContent=guided.length?`${Math.round(correct/guided.length*100)}%`:'—';
}
function populateSubjects(){
  $('subjectFilter').innerHTML='<option value="all">Todas as matérias</option>'+SUBJECTS.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
}
function eligibleQuestions(){
  const origin=$('originFilter').value,subject=$('subjectFilter').value,priority=$('priorityFilter').value;
  let qs=QUESTIONS.filter(q=>origin==='all'||(origin==='official'?isOfficial(q):!isOfficial(q)));
  if(subject!=='all')qs=qs.filter(q=>q.subject===subject);
  if(priority==='core')qs=qs.filter(q=>CORE.has(q.subject));
  if(priority==='review'){
    const open=new Set(Object.values(state.reviews).filter(r=>!r.mastered).map(r=>r.qid));
    qs=qs.filter(q=>open.has(q.id));
  }
  return qs;
}
function pickQuestion(){
  const qs=eligibleQuestions();
  if(!qs.length){current=null;currentAnswered=null;$('questionArea').innerHTML='<div class="guided-empty"><strong>Nenhuma questão neste filtro.</strong><br>Troque a origem, matéria ou prioridade.</div>';return;}
  const priority=$('priorityFilter').value;
  let pool=qs;
  if(priority==='unseen'){
    const unseen=qs.filter(q=>!state.guided.seen[q.id]);
    pool=unseen.length?unseen:qs.sort((a,b)=>(state.guided.seen[a.id]||0)-(state.guided.seen[b.id]||0)).slice(0,Math.max(1,Math.ceil(qs.length*.2)));
  }
  if(current&&pool.length>1)pool=pool.filter(q=>q.id!==current.id);
  current=pool[Math.floor(Math.random()*pool.length)]||qs[0];
  currentAnswered=null;questionStartedAt=now();
  renderQuestion();renderAnalysisIntro();
}
function renderQuestion(){
  if(!current)return;
  const q=current, answered=currentAnswered;
  const origin=isOfficial(q)?`FGV Oficial • ${q.exam?`${q.exam}º EOU`:''}${q.questionNumber?` • Q${q.questionNumber}`:''}`:'Autoral fundamentada';
  $('questionArea').innerHTML=`
    <div class="guided-kicker"><span class="guided-source">${esc(origin)}</span><span class="guided-source">${esc(subjectName(q.subject))}</span><span class="guided-source">${esc(q.topic||'Tema geral')}</span></div>
    <h2>${esc(q.text)}</h2>
    <div class="guided-options">${q.options.map((o,i)=>{let cls='';if(answered){if(i===q.correct)cls='correct';else if(i===answered.choice)cls='wrong';}return `<button class="guided-option ${cls}" data-choice="${i}" ${answered?'disabled':''}><span class="letter">${letter(i)}</span><span>${esc(o)}</span></button>`}).join('')}</div>
    <div class="guided-after ${answered?'':'hidden'}" id="guidedAfter"></div>`;
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answerQuestion(Number(b.dataset.choice)));
  if(answered)renderVerdict();
}
function renderVerdict(){
  const box=$('guidedAfter');if(!box||!currentAnswered)return;
  const ok=currentAnswered.correct;
  box.classList.remove('hidden');
  box.innerHTML=`<div class="guided-verdict ${ok?'':'bad'}"><strong>${ok?'Correto.':'Errado.'} Gabarito ${letter(current.correct)}.</strong><span>${esc(current.explanation||'Veja a análise guiada ao lado.')}</span>${!ok?`<div class="cause-row"><button data-cause="knowledge">Não sabia a regra</button><button data-cause="confusion">Confundi conceitos</button><button data-cause="reading">Leitura/atenção</button></div>`:''}</div>`;
  document.querySelectorAll('[data-cause]').forEach(b=>b.onclick=()=>setCause(b.dataset.cause));
}
function updateReview(q,correct){
  const r=state.reviews[q.id];
  if(!correct){state.reviews[q.id]={qid:q.id,subject:q.subject,topic:q.topic,due:now()+DAY,interval:1,streak:0,mastered:false,lastResult:false,lastSeen:now(),cause:r?.cause||null};return;}
  if(r){const intervals=[3,7,14,30,60],streak=(r.streak||0)+1,interval=intervals[Math.min(streak-1,intervals.length-1)];state.reviews[q.id]={...r,due:now()+interval*DAY,interval,streak,mastered:streak>=4,lastResult:true,lastSeen:now()};}
}
function answerQuestion(choice){
  if(!current||currentAnswered)return;
  const correct=choice===current.correct,timeMs=now()-questionStartedAt;
  currentAnswered={choice,correct,timeMs,cause:null};
  state.attempts.push({qid:current.id,subject:current.subject,topic:current.topic,correct,choice,timeMs,mode:'guided',ts:now(),cause:null,origin:isOfficial(current)?'official-fgv':'authorial'});
  state.guided.seen[current.id]=now();state.guided.answered=(state.guided.answered||0)+1;if(correct)state.guided.correct=(state.guided.correct||0)+1;
  updateReview(current,correct);persistState();renderQuestion();renderGuidedAnalysis(current);
}
function setCause(cause){
  if(!currentAnswered||currentAnswered.correct)return;currentAnswered.cause=cause;
  const last=[...state.attempts].reverse().find(a=>a.qid===current.id&&a.mode==='guided');if(last)last.cause=cause;
  if(state.reviews[current.id])state.reviews[current.id].cause=cause;persistState();
  document.querySelectorAll('[data-cause]').forEach(b=>b.classList.toggle('active',b.dataset.cause===cause));
}

function renderAnalysisIntro(){
  const q=current,words=decisiveWords(q?.text||'');
  $('analysisArea').innerHTML=`
    <article class="card analysis-card"><h3>1. Leia o comando</h3><p>${esc(inferCommand(q?.text||''))}</p>${words.length?`<div class="decisive-words">${words.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}</article>
    <article class="card analysis-card"><h3>2. Responda antes da teoria</h3><p>Escolha uma alternativa sem consultar. A explicação completa só aparece depois da resposta para preservar recuperação ativa e efeito diagnóstico.</p></article>
    <article class="card analysis-card"><h3>3. Correção causal</h3><p>Se errar, classifique a causa. Isso define o que deve voltar para revisão: regra desconhecida, confusão conceitual ou falha de leitura.</p></article>`;
}
function analysisCards(a,q,{ai=false}={}){
  return `
    <article class="card analysis-card"><h3>Comando da questão</h3><p>${esc(a.command||inferCommand(q.text))}</p>${Array.isArray(a.decisiveWords)&&a.decisiveWords.length?`<div class="decisive-words">${a.decisiveWords.slice(0,8).map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}</article>
    <article class="card analysis-card"><h3>Conceito por trás</h3><p>${esc(a.concept||'')}</p></article>
    <article class="card analysis-card"><h3>Armadilha / ponto de discriminação</h3><p>${esc(a.trap||'')}</p></article>
    <article class="card analysis-card"><h3>Alternativa por alternativa</h3><div class="alt-analysis">${(a.alternatives||[]).slice(0,4).map((x,i)=>`<div class="alt-analysis-item ${(x.status==='certa'||i===q.correct)?'good':'bad'}"><b>${esc(x.letter||letter(i))}</b><span><strong>${(x.status==='certa'||i===q.correct)?'Certa':'Errada'}:</strong> ${esc(x.why||'')}</span></div>`).join('')}</div></article>
    <article class="card analysis-card"><h3>Regra que precisa ficar</h3><p>${esc(a.rule||'')}</p></article>
    <article class="card analysis-card"><h3>Fixação na memória</h3><p>${esc(a.memory||'')}</p>${sourceHtml(q)}${ai?'<div class="ai-note">Comentário individualizado por IA a partir do enunciado, alternativas, gabarito e material editorial do banco. Não altera o gabarito oficial/editorial.</div>':''}</article>`;
}
async function renderGuidedAnalysis(q){
  const fallback=fallbackAnalysis(q);$('analysisArea').innerHTML=analysisCards(fallback,q);
  const cached=commentCache[q.id]?.analysis;if(cached){$('analysisArea').innerHTML=analysisCards(cached,q,{ai:true});return;}
  if(!currentUser||!tutor){
    $('analysisArea').insertAdjacentHTML('beforeend','<article class="card analysis-card"><h3>Análise individual das erradas</h3><p>Entre com Google para gerar a justificativa jurídica individualizada de A, B, C e D. O comentário editorial e o registro de revisão já funcionam sem login.</p><button class="btn secondary full" id="analysisLogin">Entrar com Google</button></article>');
    const b=$('analysisLogin');if(b)b.onclick=login;
    return;
  }
  const loading=document.createElement('article');loading.className='card analysis-card';loading.innerHTML='<div class="analysis-loading">Gerando comentário técnico individual das quatro alternativas…</div>';$('analysisArea').appendChild(loading);
  try{
    const payload=buildTutorPayload(q),result=await tutor(payload),parsed=parseTutorAnalysis(result.data?.answer,q);
    commentCache[q.id]={ts:now(),analysis:parsed};saveCommentCache();
    if(current?.id===q.id&&currentAnswered)$('analysisArea').innerHTML=analysisCards(parsed,q,{ai:true});
  }catch(error){loading.remove();showNotice('Não foi possível ampliar o comentário com IA. O comentário editorial permanece disponível.');}
}
function buildTutorPayload(q){
  const opts=q.options.map((o,i)=>`${letter(i)}) ${String(o).slice(0,360)}`).join('\n');
  const sources=(q.sources||[]).map(s=>s.title||s.kind).filter(Boolean).join('; ');
  const context=`ENUNCIADO:\n${String(q.text).slice(0,1450)}\n\nALTERNATIVAS:\n${opts}\n\nGABARITO FIXO: ${letter(q.correct)}\nCOMENTÁRIO EDITORIAL: ${String(q.explanation||'').slice(0,700)}\nFONTES CADASTRADAS: ${sources}`.slice(0,3450);
  const question=`Produza estudo guiado da questão acima. Não altere o gabarito ${letter(q.correct)}. Explique por que CADA alternativa é certa ou errada, apontando o detalhe jurídico decisivo; identifique comando, palavras decisivas, conceito central e armadilha. Não invente artigo, súmula ou precedente; se o número não for seguro, descreva a regra sem numeração. Responda SOMENTE JSON válido, sem markdown, no formato: {"command":"...","decisiveWords":["..."],"concept":"...","trap":"...","alternatives":[{"letter":"A","status":"certa|errada","why":"..."},{"letter":"B","status":"certa|errada","why":"..."},{"letter":"C","status":"certa|errada","why":"..."},{"letter":"D","status":"certa|errada","why":"..."}],"rule":"...","memory":"..."}.`;
  return {subject:subjectName(q.subject),question,context};
}
function parseTutorAnalysis(text,q){
  let raw=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a>=0&&b>a)raw=raw.slice(a,b+1);
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed.alternatives)||parsed.alternatives.length!==4)throw new Error('Análise incompleta');
  parsed.alternatives=parsed.alternatives.map((x,i)=>({...x,letter:letter(i),status:i===q.correct?'certa':'errada'}));
  return parsed;
}

async function initFirebase(){
  try{
    if(!window.OAB_FIREBASE_CONFIG)return;
    const app=getApps()[0]||initializeApp(window.OAB_FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);tutor=httpsCallable(getFunctions(app,'southamerica-east1'),'tutorOab');
    onAuthStateChanged(auth,async user=>{
      currentUser=user;
      if(!user){$('userName').textContent=state.profile.name||'Usuário local';$('userAvatar').textContent=(state.profile.name||'U')[0].toUpperCase();$('syncStatus').textContent='Dados salvos neste navegador';$('loginGoogle').classList.remove('hidden');$('logoutGoogle').classList.add('hidden');$('aiStatus').textContent='Entre com Google para comentário jurídico individualizado por IA.';return;}
      $('userName').textContent=user.displayName||user.email||'Conta Google';$('userAvatar').textContent=(user.displayName||user.email||'U')[0].toUpperCase();$('loginGoogle').classList.add('hidden');$('logoutGoogle').classList.remove('hidden');$('syncStatus').textContent='Sincronizando…';$('aiStatus').textContent='IA conectada: a correção detalha A, B, C e D automaticamente.';
      try{
        const ref=doc(db,'users',user.uid,'state','main'),snap=await getDoc(ref);
        if(snap.exists()&&Number(snap.data()?.updatedAt||0)>Number(state.updatedAt||0)){state=normalizeState(snap.data());localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
        else await setDoc(ref,state);
        $('syncStatus').textContent='Sincronizado com a nuvem';renderStats();
        if(currentAnswered&&current)renderGuidedAnalysis(current);
      }catch{$('syncStatus').textContent='Conta conectada • modo local';}
    });
  }catch{ $('aiStatus').textContent='Comentário editorial ativo; IA indisponível nesta carga.'; }
}
async function login(){if(!auth){showNotice('Login ainda não carregou.');return;}try{await signInWithPopup(auth,new GoogleAuthProvider());}catch{showNotice('Não foi possível concluir o login Google.');}}

async function bootstrap(){
  populateSubjects();
  $('applyFilters').onclick=pickQuestion;$('nextTop').onclick=pickQuestion;$('loginGoogle').onclick=login;$('logoutGoogle').onclick=()=>auth&&signOut(auth);
  try{
    const imported=await getAllQuestions(),builtins=Array.isArray(window.OAB_QUESTIONS)?window.OAB_QUESTIONS:[],merged=new Map(builtins.map(q=>[q.id,q]));imported.forEach(q=>merged.set(q.id,q));QUESTIONS=[...merged.values()];
    breakdown=await getQuestionBankBreakdown().catch(()=>null);renderStats();pickQuestion();
  }catch(error){$('questionArea').innerHTML='<div class="guided-empty"><strong>Falha ao carregar o banco.</strong><br>Recarregue a página ou use o banco local.</div>';showNotice(error?.message||'Falha ao carregar banco.');}
  initFirebase();
}
bootstrap();
