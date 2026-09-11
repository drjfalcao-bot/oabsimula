import fs from 'node:fs';

function load(path){ return fs.readFileSync(path,'utf8'); }
function save(path,text){ fs.writeFileSync(path,text,'utf8'); }
function replaceOnce(text,oldText,newText,label){
  if(!text.includes(oldText)) throw new Error(`Patch não encontrou: ${label}`);
  return text.replace(oldText,newText);
}

let s=load('app.js');
s=replaceOnce(s,
`function sourceBase(q){return TOPIC_BASES[topicId(q)]||BASES[canon(q.subject)]||'Legislação específica do instituto cobrado.';}
function usefulExplanation`,
`function legalBasis(q){const rows=(q?.legalBasis||[]).map(x=>typeof x==='string'?x:(x?.label||x?.title||'')).filter(Boolean);return rows.length?rows.slice(0,3).join(' • '):null;}
function sourceBase(q){return legalBasis(q)||TOPIC_BASES[topicId(q)]||BASES[canon(q.subject)]||'Legislação específica do instituto cobrado.';}
function usefulExplanation`,'base jurídica específica');

s=replaceOnce(s,
`function attemptsForQ(id){return state.attempts.filter(a=>a.qid===id);}
function attemptsForConcept(q){const sid=canon(q.subject),tid=topicId(q);return state.attempts.filter(a=>canon(a.subject)===sid && ((INTEL?.resolveTopic(sid,a.topic)?.id)||'geral')===tid);}
function recurrence(q){const qa=attemptsForQ(q.id),ca=attemptsForConcept(q);return {qWrong:qa.filter(a=>!a.correct).length,cWrong:ca.filter(a=>!a.correct).length,qTotal:qa.length,cTotal:ca.length};}`,
`function attemptsForQ(id){return state.attempts.filter(a=>a.qid===id);}
function conceptKeyQ(q){const sid=canon(q?.subject),t=topicOf(q),raw=INTEL?.normalize?.(q?.topic||q?.ruleId||q?.id||'geral')||String(q?.topic||q?.ruleId||q?.id||'geral');return \`${'${sid}'}|${'${t?.id||`raw:${raw}`}'}\`;}
function conceptKeyA(a){const sid=canon(a?.subject);let t=null;try{t=INTEL?.resolveTopic(sid,a?.topic)||null;}catch{}const raw=INTEL?.normalize?.(a?.topic||a?.ruleId||a?.qid||'geral')||String(a?.topic||a?.ruleId||a?.qid||'geral');return \`${'${sid}'}|${'${t?.id||`raw:${raw}`}'}\`;}
function attemptsForConcept(q){const key=conceptKeyQ(q);return state.attempts.filter(a=>conceptKeyA(a)===key);}
function recurrence(q){const qa=attemptsForQ(q.id),ca=attemptsForConcept(q);return {qWrong:qa.filter(a=>!a.correct).length,cWrong:ca.filter(a=>!a.correct).length,qTotal:qa.length,cTotal:ca.length};}
function recurrentConceptCount(){const keys=new Set();for(const r of Object.values(state.reviews||{})){if(r.mastered)continue;const q=qById(r.qid);if(q&&attemptsForConcept(q).filter(a=>!a.correct).length>=2)keys.add(conceptKeyQ(q));}return keys.size;}`,'chave de conceito');

const oldOverall=`function overall(){const total=state.attempts.length,correct=state.attempts.filter(a=>a.correct).length,projected=SUBJECTS.reduce((n,s)=>n+s.q*stats(s.id).estimated,0),due=Object.values(state.reviews).filter(r=>!r.mastered&&r.due<=now()).length,recurrent=Object.values(state.reviews).filter(r=>(r.lapses||r.wrongCount||0)>=2&&!r.mastered).length,unclassified=state.attempts.filter(a=>!a.correct&&!a.cause).length;return {total,correct,accuracy:total?correct/total:0,projected,due,recurrent,unclassified};}`;
const newOverall=`function overall(){const total=state.attempts.length,correct=state.attempts.filter(a=>a.correct).length,projected=SUBJECTS.reduce((n,s)=>n+s.q*stats(s.id).estimated,0),due=Object.values(state.reviews).filter(r=>!r.mastered&&r.due<=now()).length,recurrent=recurrentConceptCount(),unclassified=state.attempts.filter(a=>!a.correct&&!a.cause).length;return {total,correct,accuracy:total?correct/total:0,projected,due,recurrent,unclassified};}`;
s=replaceOnce(s,oldOverall,newOverall,'métrica de reincidência');

const oldReview=`function updateReview(q,correct){const old=state.reviews[q.id];if(!correct){const wrong=(old?.wrongCount||0)+1,lapses=(old?.lapses||0)+1;state.reviews[q.id]={...(old||{}),qid:q.id,subject:canon(q.subject),topic:topicLabel(q),due:now()+(wrong>=2?8*HOUR:DAY),interval:wrong>=2?.33:1,streak:0,mastered:false,lastResult:false,lastSeen:now(),cause:old?.cause||null,wrongCount:wrong,lapses};return;}if(old){const intervals=[3,7,14,30,60],streak=(old.streak||0)+1,interval=intervals[Math.min(streak-1,intervals.length-1)];state.reviews[q.id]={...old,due:now()+interval*DAY,interval,streak,mastered:streak>=4,lastResult:true,lastSeen:now()};}}`;
const newReview=`function updateReview(q,correct){const old=state.reviews[q.id];if(!correct){const wrong=(old?.wrongCount||0)+1,lapses=(old?.lapses||0)+1,conceptWrong=attemptsForConcept(q).filter(a=>!a.correct).length,recurrent=wrong>=2||conceptWrong>=2;state.reviews[q.id]={...(old||{}),qid:q.id,subject:canon(q.subject),topic:topicLabel(q),due:now()+(recurrent?8*HOUR:DAY),interval:recurrent?1/3:1,streak:0,mastered:false,lastResult:false,lastSeen:now(),cause:null,wrongCount:wrong,lapses};return;}if(old){const intervals=[3,7,14,30,60],streak=(old.streak||0)+1,interval=intervals[Math.min(streak-1,intervals.length-1)];state.reviews[q.id]={...old,due:now()+interval*DAY,interval,streak,mastered:streak>=6,lastResult:true,lastSeen:now()};}}`;
s=replaceOnce(s,oldReview,newReview,'SRS principal');

const oldReinforce=`function addReinforcement(){if(!session)return;const q=session.qs[session.index],sid=canon(q.subject),tid=topicId(q);let same=QUESTIONS.filter(x=>x.id!==q.id&&canon(x.subject)===sid&&topicId(x)===tid&&!session.qs.some(y=>y.id===x.id));if(!same.length){notice('Não há outra questão desse conceito no banco atual. O tema ficou priorizado na Trilha.');return;}if(INTEL)same=INTEL.selectAdaptiveQuestions(same.map(x=>({...x,topic:topicLabel(x)})),state,{limit:same.length,strategy:state.profile.strategy,subject:sid});session.qs.splice(session.index+1,0,same[0]);notice('Questão de reforço inserida logo a seguir.');renderQuestion();}`;
const newReinforce=`function addReinforcement(){if(!session)return;const q=session.qs[session.index],sid=canon(q.subject),key=conceptKeyQ(q);let same=QUESTIONS.filter(x=>x.id!==q.id&&conceptKeyQ(x)===key&&!session.qs.some(y=>y.id===x.id));if(!same.length){notice('Não há outra questão desse conceito no banco atual. O conceito ficou registrado para revisão.');return;}if(INTEL)same=INTEL.selectAdaptiveQuestions(same.map(x=>({...x,topic:topicLabel(x)})),state,{limit:same.length,strategy:state.profile.strategy,subject:sid});session.qs.splice(session.index+1,0,same[0]);notice('Questão de reforço inserida logo a seguir.');renderQuestion();}`;
s=replaceOnce(s,oldReinforce,newReinforce,'reforço por conceito');

const oldRows=`function errorRows(){return Object.values(state.reviews).map(r=>{const q=qById(r.qid),a=state.attempts.filter(x=>x.qid===r.qid),wrong=a.filter(x=>!x.correct).length;return {...r,q,wrong,total:a.length,recurrent:wrong>=2||(r.lapses||0)>=2};}).filter(x=>x.q);}`;
const newRows=`function errorRows(){return Object.values(state.reviews).map(r=>{const q=qById(r.qid);if(!q)return null;const a=state.attempts.filter(x=>x.qid===r.qid),wrong=a.filter(x=>!x.correct).length,conceptWrong=attemptsForConcept(q).filter(x=>!x.correct).length;return {...r,q,wrong,total:a.length,conceptWrong,recurrent:wrong>=2||conceptWrong>=2||(r.lapses||0)>=2};}).filter(Boolean);}`;
s=replaceOnce(s,oldRows,newRows,'linhas de erro');

const oldTopicBlock=`function startTopicBlock(id){const q=qById(id);if(!q)return;const sid=canon(q.subject),tid=topicId(q);let qs=QUESTIONS.filter(x=>canon(x.subject)===sid&&topicId(x)===tid);qs=uniqueFamilies(qs).sort(()=>Math.random()-.5).slice(0,5);if(!qs.length)return;session={mode:'reinforcement',qs,index:0,answers:{},startedAt:now(),questionStartedAt:now()};$('sessionSetup').classList.add('hidden');$('sessionResult').classList.add('hidden');$('sessionArea').classList.remove('hidden');page('questions');startTimer();renderQuestion();}`;
const newTopicBlock=`function startTopicBlock(id){const q=qById(id);if(!q)return;const key=conceptKeyQ(q);let qs=QUESTIONS.filter(x=>conceptKeyQ(x)===key);qs=uniqueFamilies(qs).sort(()=>Math.random()-.5).slice(0,5);if(!qs.length){notice('Não há questões suficientes deste conceito.');return;}session={mode:'reinforcement',qs,index:0,answers:{},startedAt:now(),questionStartedAt:now()};$('sessionSetup').classList.add('hidden');$('sessionResult').classList.add('hidden');$('sessionArea').classList.remove('hidden');page('questions');startTimer();renderQuestion();}`;
s=replaceOnce(s,oldTopicBlock,newTopicBlock,'bloco de conceito');

s=s.replace(`${'${x.wrong}'} erro(s)</span><span class="pill ${'${x.due<=now()?\'warn\':\'\'}'}">`,`${'${x.wrong}'} erro(s) na questão</span><span class="pill ${'${x.conceptWrong>=2?\'bad\':\'\'}'}">${'${x.conceptWrong}'} erro(s) no conceito</span><span class="pill ${'${x.due<=now()?\'warn\':\'\'}'}">`);
s=s.replace('<b>Base:</b> ${sourceBase(x.q)}','<b>Base de revisão:</b> ${sourceBase(x.q)}');
save('app.js',s);

s=load('questao-guiada.js');
s=replaceOnce(s,
`function topicLabel(q){return topic(q)?.label||String(q?.topic||'Conteúdo geral').replace(/\\s*•\\s*prova oficial/ig,'');}
function useful(q){`,
`function topicLabel(q){return topic(q)?.label||String(q?.topic||'Conteúdo geral').replace(/\\s*•\\s*prova oficial/ig,'');}
function legalBasis(q){const rows=(q?.legalBasis||[]).map(x=>typeof x==='string'?x:(x?.label||x?.title||'')).filter(Boolean);return rows.length?rows.slice(0,3).join(' • '):null;}
function useful(q){`,'base guiada');

s=replaceOnce(s,
`function attemptsQ(q){return state.attempts.filter(a=>a.qid===q.id);}
function attemptsTopic(q){const sid=canon(q.subject),tid=topic(q)?.id||topicLabel(q);return state.attempts.filter(a=>canon(a.subject)===sid&&((INTEL?.resolveTopic(sid,a.topic)?.id)||a.topic)===tid);}
function recurrence(q){return {qWrong:attemptsQ(q).filter(a=>!a.correct).length,tWrong:attemptsTopic(q).filter(a=>!a.correct).length};}`,
`function attemptsQ(q){return state.attempts.filter(a=>a.qid===q.id);}
function conceptKeyQ(q){const sid=canon(q?.subject),t=topic(q),raw=INTEL?.normalize?.(q?.topic||q?.ruleId||q?.id||'geral')||String(q?.topic||q?.ruleId||q?.id||'geral');return \`${'${sid}'}|${'${t?.id||`raw:${raw}`}'}\`;}
function conceptKeyA(a){const sid=canon(a?.subject);let t=null;try{t=INTEL?.resolveTopic(sid,a?.topic)||null;}catch{}const raw=INTEL?.normalize?.(a?.topic||a?.ruleId||a?.qid||'geral')||String(a?.topic||a?.ruleId||a?.qid||'geral');return \`${'${sid}'}|${'${t?.id||`raw:${raw}`}'}\`;}
function attemptsTopic(q){const key=conceptKeyQ(q);return state.attempts.filter(a=>conceptKeyA(a)===key);}
function recurrence(q){return {qWrong:attemptsQ(q).filter(a=>!a.correct).length,tWrong:attemptsTopic(q).filter(a=>!a.correct).length};}`,'conceito guiado');

const oldGuidedReview=`function updateReview(q,correct){const old=state.reviews[q.id];if(!correct){const wrong=(old?.wrongCount||0)+1;state.reviews[q.id]={...(old||{}),qid:q.id,subject:canon(q.subject),topic:topicLabel(q),due:Date.now()+(wrong>=2?8*HOUR:DAY),interval:wrong>=2?.33:1,streak:0,mastered:false,lastSeen:Date.now(),lastResult:false,cause:old?.cause||null,wrongCount:wrong,lapses:(old?.lapses||0)+1};return;}if(old){const ints=[3,7,14,30,60],streak=(old.streak||0)+1,interval=ints[Math.min(streak-1,ints.length-1)];state.reviews[q.id]={...old,due:Date.now()+interval*DAY,interval,streak,mastered:streak>=4,lastSeen:Date.now(),lastResult:true};}}`;
const newGuidedReview=`function updateReview(q,correct){const old=state.reviews[q.id];if(!correct){const wrong=(old?.wrongCount||0)+1,conceptWrong=attemptsTopic(q).filter(a=>!a.correct).length,recurrent=wrong>=2||conceptWrong>=2;state.reviews[q.id]={...(old||{}),qid:q.id,subject:canon(q.subject),topic:topicLabel(q),due:Date.now()+(recurrent?8*HOUR:DAY),interval:recurrent?1/3:1,streak:0,mastered:false,lastSeen:Date.now(),lastResult:false,cause:null,wrongCount:wrong,lapses:(old?.lapses||0)+1};return;}if(old){const ints=[3,7,14,30,60],streak=(old.streak||0)+1,interval=ints[Math.min(streak-1,ints.length-1)];state.reviews[q.id]={...old,due:Date.now()+interval*DAY,interval,streak,mastered:streak>=6,lastSeen:Date.now(),lastResult:true};}}`;
s=replaceOnce(s,oldGuidedReview,newGuidedReview,'SRS guiado');

s=replaceOnce(s,
`state.attempts.push({qid:current.id,subject:canon(current.subject),topic:topicLabel(current),correct,choice:i,timeMs,mode:'guided',ts:Date.now(),cause:null,origin:current.origin||null});`,
`state.attempts.push({qid:current.id,ruleId:current.ruleId||null,subject:canon(current.subject),topic:topicLabel(current),correct,choice:i,timeMs,mode:'guided',ts:Date.now(),cause:null,origin:current.origin||null});`,'ruleId guiado');

s=replaceOnce(s,
`function sameConcept(){const sid=canon(current.subject),tid=topic(current)?.id||topicLabel(current);return QUESTIONS.filter(q=>q.id!==current.id&&canon(q.subject)===sid&&((topic(q)?.id)||topicLabel(q))===tid);}`,
`function sameConcept(){const key=conceptKeyQ(current);return QUESTIONS.filter(q=>q.id!==current.id&&conceptKeyQ(q)===key);}`,'reforço guiado');

s=s.replace("${escapeHtml(BASES[canon(q.subject)]||'Legislação específica do instituto cobrado.')}","${escapeHtml(legalBasis(q)||BASES[canon(q.subject)]||'Legislação específica do instituto cobrado.')}");
save('questao-guiada.js',s);

if(fs.existsSync('review-remediation.js')) fs.unlinkSync('review-remediation.js');
console.log('Patch de erros/revisão aplicado.');
