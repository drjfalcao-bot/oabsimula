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
const INTEL=window.OAB_INTELLIGENCE||null;
const CORE=new Set(SUBJECTS.filter(s=>s.core).map(s=>s.id));
const now=()=>Date.now();
const params=new URLSearchParams(location.search);
let requestedTopic=params.get('topic')||null;
let QUESTIONS=[];
let breakdown=null;
let current=null;
let currentAnswered=null;
let questionStartedAt=now();
let state=loadState();
let commentCache=loadCommentCache();
let auth=null,db=null,tutor=null,currentUser=null;

function defaultState(){return {version:3,profile:{name:'Usuário local',strategy:'core'},attempts:[],reviews:{},sessions:[],settings:{},guided:{seen:{},answered:0,correct:0},updatedAt:now()};}
function normalizeState(raw){
  const base=defaultState(),s={...base,...(raw||{})};
  s.profile={...base.profile,...(raw?.profile||{})};s.settings={...base.settings,...(raw?.settings||{})};
  s.attempts=Array.isArray(raw?.attempts)?raw.attempts:[];s.reviews=raw?.reviews&&typeof raw.reviews==='object'?raw.reviews:{};s.sessions=Array.isArray(raw?.sessions)?raw.sessions:[];
  s.guided={seen:{},answered:0,correct:0,...(raw?.guided||{})};s.guided.seen=s.guided.seen&&typeof s.guided.seen==='object'?s.guided.seen:{};
  return s;
}
function loadState(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}catch{return defaultState();}}
function persistState({cloud=true}={}){state.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderStats();if(cloud&&currentUser&&db)setDoc(doc(db,'users',currentUser.uid,'state','main'),state).then(()=>{$('syncStatus').textContent='Sincronizado com a nuvem';}).catch(()=>{$('syncStatus').textContent='Salvo localmente • nuvem indisponível';});}
function loadCommentCache(){try{const v=JSON.parse(localStorage.getItem(COMMENT_CACHE_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
function saveCommentCache(){const entries=Object.entries(commentCache).sort((a,b)=>(b[1]?.ts||0)-(a[1]?.ts||0)).slice(0,250);commentCache=Object.fromEntries(entries);localStorage.setItem(COMMENT_CACHE_KEY,JSON.stringify(commentCache));}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function canonicalSubject(v){try{return INTEL?.canonicalSubject(v)||v;}catch{return v;}}
function subjectName(id){const c=canonicalSubject(id);return SUBJECTS.find(s=>s.id===c)?.name||INTEL?.SUBJECTS?.[c]?.name||id||'Geral';}
function isOfficial(q){return Boolean(q?.official||q?.origin==='official-fgv'||q?.sourceType==='fgv-official');}
function letter(i){return String.fromCharCode(65+Number(i||0));}
function showNotice(msg){$('notice').textContent=msg;$('notice').classList.remove('hidden');setTimeout(()=>$('notice').classList.add('hidden'),4500);}
function sameTopic(a,b){if(!a||!b)return false;if(INTEL){try{return INTEL.resolveTopic(a.subject,a.topic)?.id===INTEL.resolveTopic(b.subject,b.topic)?.id&&canonicalSubject(a.subject)===canonicalSubject(b.subject);}catch{}}return canonicalSubject(a.subject)===canonicalSubject(b.subject)&&String(a.topic||'')===String(b.topic||'');}
function topicIntel(q){if(!INTEL||!q)return null;try{const t=INTEL.resolveTopic(q.subject,q.topic);return t?INTEL.topicPriority(state,q.subject,t):null;}catch{return null;}}

function decisiveWords(text){const patterns=['incorreta','correta','exceto','não','apenas','somente','salvo','vedado','permitido','poderá','deverá','obrigatório','facultativo','prazo','competência','legitimidade','cabível','efeito'];const lower=String(text||'').toLowerCase();return patterns.filter(w=>lower.includes(w)).slice(0,8);}
function inferCommand(text){const clean=String(text||'').replace(/\s+/g,' ').trim();const sentences=clean.split(/(?<=[?.!])\s+/).filter(Boolean);const explicit=[...sentences].reverse().find(s=>/(assinale|indique|marque|alternativa|afirmativa|é correto|é incorreto|pode|deve|deverá|poderá|qual)/i.test(s));return explicit||sentences.at(-1)||clean.slice(-260);}
function safeUrl(v){try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}}
function sourceHtml(q){const sources=Array.isArray(q.sources)?q.sources:[];if(!sources.length&&q.source)return `<div class="source-list"><span>${esc(q.source)}</span></div>`;return `<div class="source-list">${sources.slice(0,4).map(s=>{const u=safeUrl(s.url);return u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.kind||'Fonte')}</a>`:`<span>${esc(s.title||s.kind||'Fonte')}</span>`}).join('')}</div>`;}
function fallbackAnalysis(q){const explanation=String(q.explanation||'O gabarito está preservado, mas este item ainda não possui comentário editorial individualizado suficiente.').trim();const concept=String(q.topic||subjectName(q.subject)).replace(/\s*•\s*prova oficial/ig,'').trim();return {command:inferCommand(q.text),decisiveWords:decisiveWords(q.text),concept:`${concept}. Identifique sujeito, competência, requisito, prazo, exceção e efeito jurídico antes de comparar as alternativas.`,trap:isOfficial(q)?'Na FGV, o distrator costuma manter quase toda a regra e trocar um requisito, exceção, competência, prazo ou efeito.':'Localize o detalhe jurídico que separa a alternativa correta das demais.',alternatives:q.options.map((o,i)=>({letter:letter(i),status:i===q.correct?'certa':'errada',why:i===q.correct?explanation:'Distrator. Compare esta proposição com a regra central e identifique o requisito ou efeito jurídico alterado.'})),rule:explanation,memory:`Sem olhar: diga a regra em uma frase e explique por que a alternativa mais parecida com o gabarito está errada.`};}

function renderStats(){const guided=state.attempts.filter(a=>a.mode==='guided'),correct=guided.filter(a=>a.correct).length;$('bankTotal').textContent=(breakdown?.total??QUESTIONS.length)||'—';$('officialTotal').textContent=(breakdown?.official??QUESTIONS.filter(isOfficial).length)||'—';$('authorialTotal').textContent=(breakdown?Math.max(0,breakdown.total-(breakdown.official||0)):QUESTIONS.filter(q=>!isOfficial(q)).length)||'—';$('guidedAttempts').textContent=guided.length;$('guidedAccuracy').textContent=guided.length?`${Math.round(correct/guided.length*100)}%`:'—';}
function populateSubjects(){$('subjectFilter').innerHTML='<option value="all">Todas as matérias</option>'+SUBJECTS.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');}
function applyUrlFilters(){const s=params.get('subject'),p=params.get('priority'),o=params.get('origin');if(s&&[...$('subjectFilter').options].some(x=>x.value===s))$('subjectFilter').value=s;if(p&&[...$('priorityFilter').options].some(x=>x.value===p))$('priorityFilter').value=p;if(o&&[...$('originFilter').options].some(x=>x.value===o))$('originFilter').value=o;}
function eligibleQuestions(){
  const origin=$('originFilter').value,subject=$('subjectFilter').value,priority=$('priorityFilter').value;
  let qs=QUESTIONS.filter(q=>origin==='all'||(origin==='official'?isOfficial(q):!isOfficial(q)));
  if(subject!=='all')qs=qs.filter(q=>canonicalSubject(q.subject)===canonicalSubject(subject));
  if(priority==='core')qs=qs.filter(q=>CORE.has(canonicalSubject(q.subject)));
  if(priority==='review'){const open=new Set(Object.values(state.reviews).filter(r=>!r.mastered).map(r=>r.qid));qs=qs.filter(q=>open.has(q.id));}
  if(requestedTopic&&INTEL){const target=INTEL.resolveTopic(subject==='all'?(qs[0]?.subject||''):subject,requestedTopic);if(target){const exact=qs.filter(q=>INTEL.resolveTopic(q.subject,q.topic)?.id===target.id);if(exact.length)qs=exact;}}
  return qs;
}
function pickQuestion(){
  const qs=eligibleQuestions();
  if(!qs.length){current=null;currentAnswered=null;$('questionArea').innerHTML='<div class="guided-empty"><strong>Nenhuma questão neste filtro.</strong><br>Troque a origem, matéria ou prioridade.</div>';return;}
  const priority=$('priorityFilter').value,subject=$('subjectFilter').value;
  let pool=[...qs];
  if(priority==='adaptive'&&INTEL){pool=INTEL.selectAdaptiveQuestions(qs,state,{limit:Math.min(30,qs.length),strategy:state.profile?.strategy==='balanced'?'balanced':'core',subject});}
  else if(priority==='unseen'){const unseen=qs.filter(q=>!state.guided.seen[q.id]);pool=unseen.length?unseen:[...qs].sort((a,b)=>(state.guided.seen[a.id]||0)-(state.guided.seen[b.id]||0)).slice(0,Math.max(1,Math.ceil(qs.length*.2)));}
  else if(priority==='review'){pool=[...qs].sort((a,b)=>Number(state.reviews[a.id]?.due||0)-Number(state.reviews[b.id]?.due||0));}
  else if(priority==='random'||priority==='core')pool=[...qs].sort(()=>Math.random()-.5);
  if(current&&pool.length>1)pool=pool.filter(q=>q.id!==current.id);
  current=pool[0]||qs[0];currentAnswered=null;questionStartedAt=now();requestedTopic=null;renderQuestion();renderAnalysisIntro();
}
function pickReinforcement(){
  if(!current)return;const same=QUESTIONS.filter(q=>q.id!==current.id&&sameTopic(q,current)&&($('originFilter').value!=='official'||isOfficial(q)));
  if(!same.length){showNotice('Não há outra questão desse mesmo tema no filtro atual. Vou manter o tema como prioridade na fila adaptativa.');pickQuestion();return;}
  let pool=same.filter(q=>!state.guided.seen[q.id]);if(!pool.length)pool=same;
  if(INTEL)pool=INTEL.selectAdaptiveQuestions(pool,state,{limit:pool.length,strategy:state.profile?.strategy==='balanced'?'balanced':'core',subject:canonicalSubject(current.subject)});
  current=pool[0]||same[0];currentAnswered=null;questionStartedAt=now();renderQuestion();renderAnalysisIntro();window.scrollTo({top:0,behavior:'smooth'});
}

function renderQuestion(){
  if(!current)return;const q=current,answered=currentAnswered,rank=topicIntel(q);const origin=isOfficial(q)?`FGV Oficial • ${q.exam?`${q.exam}º EOU`:''}${q.questionNumber?` • Q${q.questionNumber}`:''}`:'Autoral fundamentada';
  const strategyTag=rank?`alvo ${Math.round(rank.topic.historicalShare*100)}% histórico • domínio ${Math.round(rank.stats.estimated*100)}%`:null;
  $('questionArea').innerHTML=`<div class="guided-kicker"><span class="guided-source">${esc(origin)}</span><span class="guided-source">${esc(subjectName(q.subject))}</span><span class="guided-source">${esc(q.topic||'Tema geral')}</span>${strategyTag?`<span class="guided-source adaptive-tag">${esc(strategyTag)}</span>`:''}</div><h2>${esc(q.text)}</h2><div class="guided-options">${q.options.map((o,i)=>{let cls='';if(answered){if(i===q.correct)cls='correct';else if(i===answered.choice)cls='wrong';}return `<button class="guided-option ${cls}" data-choice="${i}" ${answered?'disabled':''}><span class="letter">${letter(i)}</span><span>${esc(o)}</span></button>`}).join('')}</div><div class="guided-after ${answered?'':'hidden'}" id="guidedAfter"></div>`;
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answerQuestion(Number(b.dataset.choice)));if(answered)renderVerdict();
}
function interventionHtml(q,cause){
  const rule=esc(String(q.explanation||'Recupere a regra central pelo comentário da questão.').slice(0,700));
  const words=decisiveWords(q.text).map(w=>`<span>${esc(w)}</span>`).join('');
  if(cause==='knowledge')return `<div class="intervention knowledge"><strong>Reforço agora: regra → recuperação → nova aplicação</strong><p><b>Regra mínima:</b> ${rule}</p><p>Feche o comentário por alguns segundos e formule a regra com suas palavras. Depois resolva outra questão do mesmo tema sem consulta.</p><button class="btn primary" data-reinforce>Outra do mesmo tema</button></div>`;
  if(cause==='confusion')return `<div class="intervention confusion"><strong>Reforço agora: separar institutos parecidos</strong><p>Escreva mentalmente: <b>“é X quando…; é Y quando…”</b>. O objetivo é achar o requisito que muda a consequência jurídica, não reler a matéria inteira.</p><button class="btn primary" data-reinforce>Testar a distinção em outra questão</button></div>`;
  if(cause==='reading')return `<div class="intervention reading"><strong>Reforço agora: técnica de prova</strong><p>Na próxima, leia primeiro o comando e marque mentalmente a palavra que altera a resposta.</p>${words?`<div class="decisive-words">${words}</div>`:''}<button class="btn primary" data-reinforce>Próxima do tema, sem pressa</button></div>`;
  return '';
}
function renderVerdict(){
  const box=$('guidedAfter');if(!box||!currentAnswered)return;const ok=currentAnswered.correct,cause=currentAnswered.cause;
  box.classList.remove('hidden');box.innerHTML=`<div class="guided-verdict ${ok?'':'bad'}"><strong>${ok?'Correto.':'Errado.'} Gabarito ${letter(current.correct)}.</strong><span>${esc(current.explanation||'Veja a análise guiada ao lado.')}</span>${!ok?`<div class="cause-row"><button data-cause="knowledge" class="${cause==='knowledge'?'active':''}">Não sabia a regra</button><button data-cause="confusion" class="${cause==='confusion'?'active':''}">Confundi conceitos</button><button data-cause="reading" class="${cause==='reading'?'active':''}">Leitura/atenção</button></div>${cause?interventionHtml(current,cause):'<p class="cause-hint">Classifique a causa para o sistema escolher o reforço correto.</p>'}`:''}</div>`;
  document.querySelectorAll('[data-cause]').forEach(b=>b.onclick=()=>setCause(b.dataset.cause));document.querySelectorAll('[data-reinforce]').forEach(b=>b.onclick=pickReinforcement);
}
function updateReview(q,correct){const r=state.reviews[q.id];if(!correct){state.reviews[q.id]={qid:q.id,subject:q.subject,topic:q.topic,due:now()+DAY,interval:1,streak:0,mastered:false,lastResult:false,lastSeen:now(),cause:r?.cause||null};return;}if(r){const intervals=[3,7,14,30,60],streak=(r.streak||0)+1,interval=intervals[Math.min(streak-1,intervals.length-1)];state.reviews[q.id]={...r,due:now()+interval*DAY,interval,streak,mastered:streak>=4,lastResult:true,lastSeen:now()};}}
function answerQuestion(choice){if(!current||currentAnswered)return;const correct=choice===current.correct,timeMs=now()-questionStartedAt;currentAnswered={choice,correct,timeMs,cause:null};state.attempts.push({qid:current.id,subject:current.subject,topic:current.topic,correct,choice,timeMs,mode:'guided',ts:now(),cause:null,origin:isOfficial(current)?'official-fgv':'authorial',ruleId:current.ruleId||null,sourceQuestionId:current.sourceQuestionId||current.officialQuestionId||null});state.guided.seen[current.id]=now();state.guided.answered=(state.guided.answered||0)+1;if(correct)state.guided.correct=(state.guided.correct||0)+1;updateReview(current,correct);persistState();renderQuestion();renderGuidedAnalysis(current);}
function setCause(cause){if(!currentAnswered||currentAnswered.correct)return;currentAnswered.cause=cause;const last=[...state.attempts].reverse().find(a=>a.qid===current.id&&a.mode==='guided');if(last)last.cause=cause;if(state.reviews[current.id])state.reviews[current.id].cause=cause;persistState();renderVerdict();renderGuidedAnalysis(current);}

function renderAnalysisIntro(){
  const q=current,words=decisiveWords(q?.text||''),rank=topicIntel(q);const why=rank?`O tema representa cerca de ${Math.round(rank.topic.historicalShare*100)}% da incidência histórica de ${subjectName(q.subject)}; seu domínio estimado está em ${Math.round(rank.stats.estimated*100)}%. A ação prescrita hoje é “${rank.action.label}”.`:'O sistema ainda está formando amostra suficiente para este tema.';
  $('analysisArea').innerHTML=`<article class="card analysis-card"><h3>1. Leia o comando</h3><p>${esc(inferCommand(q?.text||''))}</p>${words.length?`<div class="decisive-words">${words.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}</article><article class="card analysis-card"><h3>2. Por que esta questão agora?</h3><p>${esc(why)}</p></article><article class="card analysis-card"><h3>3. Responda antes da teoria</h3><p>A explicação completa aparece depois da resposta. Isso preserva recuperação ativa e transforma a tentativa em diagnóstico real.</p></article>`;
}
function analysisCards(a,q,{ai=false}={}){const rank=topicIntel(q);return `<article class="card analysis-card"><h3>Comando da questão</h3><p>${esc(a.command||inferCommand(q.text))}</p>${Array.isArray(a.decisiveWords)&&a.decisiveWords.length?`<div class="decisive-words">${a.decisiveWords.slice(0,8).map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}</article>${rank?`<article class="card analysis-card"><h3>Leitura estratégica</h3><p>${Math.round(rank.topic.historicalShare*100)}% da incidência histórica da matéria • domínio estimado ${Math.round(rank.stats.estimated*100)}% • ${rank.stats.n} resposta(s) no tema • próxima ação: ${esc(rank.action.label)}.</p></article>`:''}<article class="card analysis-card"><h3>Conceito por trás</h3><p>${esc(a.concept||'')}</p></article><article class="card analysis-card"><h3>Armadilha / ponto de discriminação</h3><p>${esc(a.trap||'')}</p></article><article class="card analysis-card"><h3>Alternativa por alternativa</h3><div class="alt-analysis">${(a.alternatives||[]).slice(0,4).map((x,i)=>`<div class="alt-analysis-item ${(x.status==='certa'||i===q.correct)?'good':'bad'}"><b>${esc(x.letter||letter(i))}</b><span><strong>${(x.status==='certa'||i===q.correct)?'Certa':'Errada'}:</strong> ${esc(x.why||'')}</span></div>`).join('')}</div></article><article class="card analysis-card"><h3>Regra que precisa ficar</h3><p>${esc(a.rule||'')}</p></article><article class="card analysis-card"><h3>Fixação na memória</h3><p>${esc(a.memory||'')}</p>${sourceHtml(q)}${ai?'<div class="ai-note">Comentário individualizado por IA. O gabarito continua sendo o do banco oficial/editorial.</div>':''}</article>`;}
async function renderGuidedAnalysis(q){
  const fallback=fallbackAnalysis(q);$('analysisArea').innerHTML=analysisCards(fallback,q);const cached=commentCache[q.id]?.analysis;if(cached){$('analysisArea').innerHTML=analysisCards(cached,q,{ai:true});return;}
  if(!currentUser||!tutor){$('analysisArea').insertAdjacentHTML('beforeend','<article class="card analysis-card"><h3>Análise individual das erradas</h3><p>Entre com Google para gerar a justificativa jurídica individualizada de A, B, C e D. O comentário editorial, o reforço causal e a revisão espaçada já funcionam sem login.</p><button class="btn secondary full" id="analysisLogin">Entrar com Google</button></article>');const b=$('analysisLogin');if(b)b.onclick=login;return;}
  const loading=document.createElement('article');loading.className='card analysis-card';loading.innerHTML='<div class="analysis-loading">Gerando comentário técnico individual das quatro alternativas…</div>';$('analysisArea').appendChild(loading);
  try{const result=await tutor(buildTutorPayload(q)),parsed=parseTutorAnalysis(result.data?.answer,q);commentCache[q.id]={ts:now(),analysis:parsed};saveCommentCache();if(current?.id===q.id&&currentAnswered)$('analysisArea').innerHTML=analysisCards(parsed,q,{ai:true});}catch{loading.remove();showNotice('Não foi possível ampliar o comentário com IA. O comentário editorial permanece disponível.');}
}
function buildTutorPayload(q){const opts=q.options.map((o,i)=>`${letter(i)}) ${String(o).slice(0,360)}`).join('\n'),sources=(q.sources||[]).map(s=>s.title||s.kind).filter(Boolean).join('; '),rank=topicIntel(q),cause=currentAnswered?.cause||null;const strategy=rank?`SINAL ESTRATÉGICO (não é regra jurídica): tema ${Math.round(rank.topic.historicalShare*100)}% da incidência histórica da matéria; domínio estimado ${Math.round(rank.stats.estimated*100)}%; ação prescrita ${rank.action.label}.`:'';const context=`ENUNCIADO:\n${String(q.text).slice(0,1450)}\n\nALTERNATIVAS:\n${opts}\n\nGABARITO FIXO: ${letter(q.correct)}\nCOMENTÁRIO EDITORIAL: ${String(q.explanation||'').slice(0,700)}\nCAUSA DO ERRO DECLARADA: ${cause||'não informada'}\n${strategy}\nFONTES CADASTRADAS: ${sources}`.slice(0,3900);const question=`Produza estudo guiado da questão. Não altere o gabarito ${letter(q.correct)}. Explique por que CADA alternativa é certa ou errada, apontando o detalhe jurídico decisivo. Se a causa foi desconhecimento, ensine a regra mínima e faça recuperação; se foi confusão, contraste os institutos; se foi leitura, destaque o dado decisivo. Não invente artigo, súmula, precedente, prazo ou quórum. Responda SOMENTE JSON válido, sem markdown, no formato: {"command":"...","decisiveWords":["..."],"concept":"...","trap":"...","alternatives":[{"letter":"A","status":"certa|errada","why":"..."},{"letter":"B","status":"certa|errada","why":"..."},{"letter":"C","status":"certa|errada","why":"..."},{"letter":"D","status":"certa|errada","why":"..."}],"rule":"...","memory":"..."}.`;return {subject:subjectName(q.subject),question,context};}
function parseTutorAnalysis(text,q){let raw=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a>=0&&b>a)raw=raw.slice(a,b+1);const parsed=JSON.parse(raw);if(!Array.isArray(parsed.alternatives)||parsed.alternatives.length!==4)throw new Error('Análise incompleta');parsed.alternatives=parsed.alternatives.map((x,i)=>({...x,letter:letter(i),status:i===q.correct?'certa':'errada'}));return parsed;}

async function initFirebase(){try{if(!window.OAB_FIREBASE_CONFIG)return;const app=getApps()[0]||initializeApp(window.OAB_FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);tutor=httpsCallable(getFunctions(app,'southamerica-east1'),'tutorOab');onAuthStateChanged(auth,async user=>{currentUser=user;if(!user){$('userName').textContent=state.profile.name||'Usuário local';$('userAvatar').textContent=(state.profile.name||'U')[0].toUpperCase();$('syncStatus').textContent='Dados salvos neste navegador';$('loginGoogle').classList.remove('hidden');$('logoutGoogle').classList.add('hidden');$('aiStatus').textContent='Treino adaptativo e reforço causal ativos; entre com Google para comentário jurídico individualizado.';return;}$('userName').textContent=user.displayName||user.email||'Conta Google';$('userAvatar').textContent=(user.displayName||user.email||'U')[0].toUpperCase();$('loginGoogle').classList.add('hidden');$('logoutGoogle').classList.remove('hidden');$('syncStatus').textContent='Sincronizando…';$('aiStatus').textContent='IA conectada: a correção detalha A, B, C e D sem alterar o gabarito.';try{const ref=doc(db,'users',user.uid,'state','main'),snap=await getDoc(ref);if(snap.exists()&&Number(snap.data()?.updatedAt||0)>Number(state.updatedAt||0)){state=normalizeState(snap.data());localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}else await setDoc(ref,state);$('syncStatus').textContent='Sincronizado com a nuvem';renderStats();if(currentAnswered&&current)renderGuidedAnalysis(current);}catch{$('syncStatus').textContent='Conta conectada • modo local';}});}catch{$('aiStatus').textContent='Comentário editorial ativo; IA indisponível nesta carga.';}}
async function login(){if(!auth){showNotice('Login ainda não carregou.');return;}try{await signInWithPopup(auth,new GoogleAuthProvider());}catch{showNotice('Não foi possível concluir o login Google.');}}

async function bootstrap(){
  populateSubjects();applyUrlFilters();$('applyFilters').onclick=()=>{requestedTopic=params.get('topic')||null;pickQuestion();};$('nextTop').onclick=pickQuestion;$('loginGoogle').onclick=login;$('logoutGoogle').onclick=()=>auth&&signOut(auth);
  try{const imported=await getAllQuestions(),builtins=Array.isArray(window.OAB_QUESTIONS)?window.OAB_QUESTIONS:[],merged=new Map(builtins.map(q=>[q.id,q]));imported.forEach(q=>merged.set(q.id,q));QUESTIONS=[...merged.values()];breakdown=await getQuestionBankBreakdown().catch(()=>null);renderStats();pickQuestion();}
  catch(error){$('questionArea').innerHTML='<div class="guided-empty"><strong>Falha ao carregar o banco.</strong><br>Recarregue a página ou use o banco local.</div>';showNotice(error?.message||'Falha ao carregar banco.');}
  initFirebase();
}
bootstrap();
