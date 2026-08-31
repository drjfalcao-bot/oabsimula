(() => {
  'use strict';
  const CFG = window.OAB_CONFIG;
  const SUBJECTS = window.OAB_SUBJECTS;
  const CORE = SUBJECTS.filter(s => s.core);
  const BUILTIN_QUESTIONS = [...window.OAB_QUESTIONS];
  let QUESTIONS = [...BUILTIN_QUESTIONS];
  const STORAGE_KEY = 'oab-aprova-premium-v1';
  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const now = () => Date.now();
  const day = 86400000;
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const fmtPct = n => `${Math.round(n*100)}%`;
  const subjectById = id => SUBJECTS.find(s=>s.id===id);
  const questionById = id => QUESTIONS.find(q=>q.id===id);
  const shuffle = arr => [...arr].sort(()=>Math.random()-.5);

  const defaultState = () => ({
    version:2,
    profile:{name:'Usuário local',targetDate:CFG.examDate,targetScore:CFG.safeTarget,dailyMinutes:60,strategy:'core'},
    attempts:[],reviews:{},sessions:[],settings:{subjectFilter:'core'},createdAt:now(),updatedAt:now()
  });

  let state = loadLocal();
  let selectedSubject = 'etica';
  let selectedMode = 'adaptive';
  let session = null;
  let timerHandle = null;
  let auth = null, db = null, currentUser = null, cloudSaveTimer = null;

  function loadLocal(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const saved=JSON.parse(raw);
      return {...defaultState(),...saved,profile:{...defaultState().profile,...(saved.profile||{})},settings:{...defaultState().settings,...(saved.settings||{})}};
    }catch(e){ return defaultState(); }
  }
  function persist(){
    state.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleCloudSave();
  }
  function scheduleCloudSave(){
    if(!currentUser || !db) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer=setTimeout(async()=>{
      try{
        await db.collection('users').doc(currentUser.uid).collection('state').doc('main').set(state);
        $('syncStatus').textContent='Sincronizado com a nuvem';
      }catch(e){ $('syncStatus').textContent='Salvo localmente • nuvem indisponível'; }
    },700);
  }

  function erf(x){
    const sign=x<0?-1:1; x=Math.abs(x);
    const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911;
    const t=1/(1+p*x);
    const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
  }
  function normalCDF(z){ return .5*(1+erf(z/Math.sqrt(2))); }
  function attemptsFor(subjectId){ return state.attempts.filter(a=>a.subject===subjectId); }
  function stats(subjectId){
    const a=attemptsFor(subjectId), n=a.length, correct=a.filter(x=>x.correct).length, wrong=n-correct;
    const raw=n?correct/n:0;
    // Posterior Beta(2+acertos, 3+erros). Prior conservador com média inicial de 40%.
    const alpha=correct+2, beta=wrong+3, sum=alpha+beta;
    const estimated=alpha/sum;
    const open=Object.values(state.reviews).filter(r=>r.subject===subjectId && !r.mastered).length;
    const due=Object.values(state.reviews).filter(r=>r.subject===subjectId && !r.mastered && r.due<=now()).length;
    const s=subjectById(subjectId);
    const target=.75;
    const potential=s.q*Math.max(0,target-estimated);
    const deficit=Math.max(0,.78-estimated);
    const errorPressure=open/(n+4);
    const uncertainty=Math.sqrt((alpha*beta)/(sum*sum*(sum+1)));
    const focus=s.q*(.55+deficit*2.2)*(1+errorPressure*.8)*(1+uncertainty*1.8);
    // Variância preditiva beta-binomial para as q questões esperadas da matéria no exame.
    const predictiveVar=s.q*alpha*beta*(sum+s.q)/(sum*sum*(sum+1));
    return {n,correct,wrong,raw,estimated,alpha,beta,open,due,potential,focus,uncertainty,predictiveVar};
  }
  function overall(){
    const total=state.attempts.length, correct=state.attempts.filter(a=>a.correct).length;
    const accuracy=total?correct/total:0;
    const subjectStats=SUBJECTS.map(s=>({s,st:stats(s.id)}));
    const projected=subjectStats.reduce((sum,x)=>sum+x.s.q*x.st.estimated,0);
    const variance=subjectStats.reduce((sum,x)=>sum+x.st.predictiveVar,0);
    const sd=Math.sqrt(Math.max(.0001,variance));
    const passZ=(CFG.passingScore-.5-projected)/sd;
    const passProbability=clamp(1-normalCDF(passZ),0,1);
    const targetZ=((state.profile.targetScore||CFG.safeTarget)-.5-projected)/sd;
    const safeProbability=clamp(1-normalCDF(targetZ),0,1);
    const low90=clamp(projected-1.645*sd,0,80), high90=clamp(projected+1.645*sd,0,80);
    const coreProjected=CORE.reduce((sum,s)=>sum+s.q*stats(s.id).estimated,0);
    const coreMastery=coreProjected/CORE.reduce((a,s)=>a+s.q,0);
    const due=Object.values(state.reviews).filter(r=>!r.mastered && r.due<=now()).length;
    const open=Object.values(state.reviews).filter(r=>!r.mastered).length;
    return {total,correct,accuracy,projected,variance,sd,passProbability,safeProbability,low90,high90,coreMastery,due,open};
  }
  function dataConfidence(){ return clamp(state.attempts.length/120,0,1); }
  function subjectRanking(){
    const base=(state.profile.strategy==='balanced'?SUBJECTS:CORE);
    return base.map(s=>({s,st:stats(s.id)})).sort((a,b)=>b.st.focus-a.st.focus);
  }
  function daysToExam(){
    const d = new Date(`${state.profile.targetDate || CFG.examDate}T12:00:00`);
    return Math.max(0,Math.ceil((d-new Date())/day));
  }
  function dueLabel(ts){
    const diff=Math.ceil((ts-now())/day);
    if(diff<=0) return 'vencida'; if(diff===1) return 'amanhã'; return `em ${diff} dias`;
  }

  function page(name){
    $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.view===name));
    $$('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
    const labels={dashboard:['CENTRAL DE APROVAÇÃO','Painel de aprovação'],plan:['ESTRATÉGIA','Plano adaptativo'],study:['CONTEÚDO','Matérias'],questions:['TREINO','Questões'],errors:['MEMÓRIA','Revisões'],analytics:['MÉTRICAS','Desempenho']};
    $('pageEyebrow').textContent=labels[name]?.[0]||'OAB APROVA'; $('pageTitle').textContent=labels[name]?.[1]||'OAB APROVA';
    window.scrollTo({top:0,behavior:'smooth'});
    if(name==='errors') renderReviews();
    if(name==='analytics') renderAnalytics();
  }

  function riskInfo(o){
    if(o.total<20) return {label:'Diagnóstico insuficiente',kind:'neutral',text:`Há ${o.total} resposta${o.total===1?'':'s'}. A probabilidade de aprovação ainda não é exibida como sinal decisório.`};
    if(o.projected>=state.profile.targetScore && o.passProbability>=.85) return {label:'Zona de segurança',kind:'good',text:`Probabilidade modelada de atingir 40: ${fmtPct(o.passProbability)}. Mantenha revisão para reduzir perda de pontos já conquistados.`};
    if(o.projected>=40 && o.passProbability>=.60) return {label:'Zona de aprovação',kind:'warn',text:`A média projetada cruza 40, mas a incerteza ainda importa. Probabilidade modelada: ${fmtPct(o.passProbability)}.`};
    if(o.passProbability>=.40) return {label:'Faixa limítrofe',kind:'warn',text:`O modelo ainda vê chance relevante de aprovação (${fmtPct(o.passProbability)}), porém sem margem estatística confortável.`};
    return {label:'Risco de reprovação',kind:'bad',text:`A probabilidade modelada de alcançar 40 está em ${fmtPct(o.passProbability)}. O foco deve permanecer no maior ganho marginal por minuto.`};
  }

  function renderDashboard(){
    const o=overall();
    $('daysToExam').textContent=daysToExam();
    $('projectedScore').textContent=o.projected.toFixed(1);
    $('scoreRing').style.setProperty('--pct',`${clamp(o.projected/80,0,1)*360}deg`);
    const conf=dataConfidence();
    $('projectionConfidence').textContent=o.total<20?(conf<.15?'projeção inicial • aumente a amostra':'projeção preliminar • quase calibrada'):`P(≥40) ${fmtPct(o.passProbability)} • faixa 90% ${o.low90.toFixed(0)}–${o.high90.toFixed(0)}`;
    const r=riskInfo(o);
    $('riskLabel').textContent=r.label; $('riskText').textContent=r.text;
    $('riskDot').className=`status-dot ${r.kind}`;
    $('scoreBar').style.width=`${clamp(o.projected/80,0,1)*100}%`;
    $('safeTarget').textContent=state.profile.targetScore;
    const margin=o.projected-40; $('scoreMargin').textContent=`${margin>=0?'+':''}${margin.toFixed(1)}`;
    $('metricAttempts').textContent=o.total; $('metricSessions').textContent=`${state.sessions.length} sessões`;
    $('metricAccuracy').textContent=fmtPct(o.accuracy); $('metricDue').textContent=o.due; $('metricOpenErrors').textContent=`${o.open} erros abertos`;
    $('metricCore').textContent=fmtPct(o.coreMastery);

    const ranking=subjectRanking().slice(0,4);
    $('priorityList').innerHTML=ranking.map((x,i)=>`<div class="priority-row"><div class="priority-rank">${i+1}</div><div><strong>${x.s.name}</strong><small>${x.s.q} questões na prova • domínio estimado ${fmtPct(x.st.estimated)} • ${x.st.n} respostas</small></div><div class="priority-value"><b>+${x.st.potential.toFixed(1)}</b><span>pontos potenciais</span></div></div>`).join('');
    const due=o.due, minutes=state.profile.dailyMinutes||60;
    const reviewMin=due?Math.max(10,Math.min(20,Math.round(minutes*.25))):Math.max(5,Math.round(minutes*.1));
    const remaining=Math.max(10,minutes-reviewMin); const first=Math.round(remaining*.58),second=remaining-first;
    const badge=$('routineBox')?.closest('.card')?.querySelector('.badge'); if(badge)badge.textContent=`${minutes} min hoje`;
    $('routineBox').innerHTML=`
      <div class="routine-step"><b>1</b><div><strong>${reviewMin} min • ${due?`revisar até ${Math.min(due,6)} vencida(s)`:'recuperação ativa'}</strong><span>${due?'Comece pelo conteúdo em maior risco de esquecimento.':'Faça questões sem consulta para gerar diagnóstico real.'}</span></div></div>
      <div class="routine-step"><b>2</b><div><strong>${first} min • ${ranking[0]?.s.name||'Ética'}</strong><span>Maior expectativa de ganho de pontos no momento.</span></div></div>
      <div class="routine-step"><b>3</b><div><strong>${second} min • ${ranking[1]?.s.name||'Constitucional'}</strong><span>Intercale questões e correção causal; teoria apenas no ponto do erro.</span></div></div>`;
    $('coreHeatmap').innerHTML=CORE.map(s=>{
      const st=stats(s.id), pct=Math.round(st.estimated*100); const color=pct>=75?'#2c7a61':pct>=55?'#c99a4b':'#b64f49';
      return `<button class="heat-cell" data-subject-open="${s.id}" style="--heat:${color}"><strong>${s.name}</strong><span>${s.q} questões</span><b>${pct}%</b></button>`;
    }).join('');
    $$('[data-subject-open]').forEach(b=>b.onclick=()=>{selectedSubject=b.dataset.subjectOpen;renderStudy();page('study')});
  }

  function renderPlan(){
    const ranking=subjectRanking(); const max=ranking[0]?.st.focus||1;
    $('planRanking').innerHTML=ranking.map((x,i)=>`<div class="ranking-item"><div class="ranking-score">${i+1}</div><div><strong>${x.s.name}</strong><small>${x.s.q} questões • ${x.st.n} respondidas • ${x.st.open} erros abertos • ganho potencial +${x.st.potential.toFixed(1)} pts</small></div><div class="ranking-bar"><div style="width:${Math.round(x.st.focus/max*100)}%"></div></div></div>`).join('');
    $('planDataQuality').textContent=state.attempts.length<30?'dados iniciais':state.attempts.length<100?'amostra em formação':'amostra robusta';
    $('targetDate').value=state.profile.targetDate; $('targetScore').value=state.profile.targetScore; $('dailyMinutes').value=state.profile.dailyMinutes; $('strategy').value=state.profile.strategy;
  }

  function renderStudy(){
    const filter=state.settings.subjectFilter||'core';
    $$('[data-subject-filter]').forEach(b=>b.classList.toggle('active',b.dataset.subjectFilter===filter));
    const arr=filter==='core'?CORE:SUBJECTS;
    $('subjectList').innerHTML=arr.map(s=>{const st=stats(s.id),bankCount=QUESTIONS.filter(q=>q.subject===s.id).length;return `<button class="subject-btn ${selectedSubject===s.id?'active':''}" data-subject="${s.id}"><div class="line1"><strong>${s.name}</strong><b>${s.q}Q</b></div><span>${st.n?`${fmtPct(st.estimated)} estimado • ${st.open} erros`:'sem diagnóstico'} • banco ${bankCount}</span></button>`}).join('');
    $$('[data-subject]').forEach(b=>b.onclick=()=>{selectedSubject=b.dataset.subject;renderStudy()});
    const s=subjectById(selectedSubject)||CORE[0], st=stats(s.id),bankCount=QUESTIONS.filter(q=>q.subject===s.id).length;
    $('subjectTier').textContent=s.core?'NÚCLEO 62 • ALTA PRIORIDADE':'PESO BAIXO • COMPLEMENTAR'; $('subjectName').textContent=s.name; $('subjectWeight').textContent=`${s.q} questões`;
    $('subjectEstimated').textContent=fmtPct(st.estimated); $('subjectSample').textContent=st.n; $('subjectErrors').textContent=st.open; $('subjectGain').textContent=`+${st.potential.toFixed(1)} pts`;
    $('subjectMeterBar').style.width=`${Math.round(st.estimated*100)}%`;
    $('subjectAdvice').textContent=bankCount===0?`Ainda não há questões de ${s.name} no banco. Importe um pacote na Central do Banco antes de diagnosticar esta matéria.`:st.n<5?`Ainda há pouca amostra. Faça um diagnóstico curto de ${s.name} antes de decidir quanta teoria estudar.`:st.estimated<.55?'Prioridade alta: use questões + correção pontual. Evite aula longa antes de identificar exatamente os temas que estão derrubando o desempenho.':st.estimated<.75?'Faixa intermediária: mantenha blocos curtos e concentre revisão nos erros reincidentes.':'Matéria em boa faixa de domínio: reduza volume e mantenha revisão espaçada para preservar pontos.';
    $('subjectTopics').innerHTML=s.topics.map(t=>`<span class="chip">${t}</span>`).join('');
  }

  function renderQuestionSelectors(){
    const previous=$('questionSubject')?.value||'all';
    $('questionSubject').innerHTML='<option value="all">Todas do núcleo</option>'+SUBJECTS.filter(s=>QUESTIONS.some(q=>q.subject===s.id)).map(s=>`<option value="${s.id}">${s.name} (${QUESTIONS.filter(q=>q.subject===s.id).length})</option>`).join('');
    if([...$('questionSubject').options].some(o=>o.value===previous))$('questionSubject').value=previous;
  }

  function makePool(mode,limit,subject='all'){
    if(mode==='review'){
      const dueIds=Object.values(state.reviews).filter(r=>!r.mastered && r.due<=now()).sort((a,b)=>a.due-b.due).map(r=>r.qid);
      return dueIds.map(questionById).filter(Boolean).slice(0,limit);
    }
    let allowedSubjects=state.profile.strategy==='balanced'?SUBJECTS:CORE;
    let base=QUESTIONS.filter(q=>subject==='all'?allowedSubjects.some(s=>s.id===q.subject):q.subject===subject);
    if(subject!=='all') return shuffle(base).slice(0,limit);
    if(mode==='adaptive'){
      const rank=subjectRanking(); let ordered=[];
      rank.forEach(x=>{const qs=shuffle(base.filter(q=>q.subject===x.s.id)); const denominator=allowedSubjects.reduce((a,s)=>a+s.q,0);ordered.push(...qs.slice(0,Math.max(1,Math.ceil(limit*(x.s.q/denominator)))))});
      const unique=[...new Map(ordered.map(q=>[q.id,q])).values()];
      if(unique.length<limit){const remaining=shuffle(base.filter(q=>!unique.some(u=>u.id===q.id)));unique.push(...remaining.slice(0,limit-unique.length));}
      return unique.slice(0,limit);
    }
    if(mode==='exam'){
      let out=[]; const denominator=allowedSubjects.reduce((a,s)=>a+s.q,0);
      allowedSubjects.forEach(s=>{const take=Math.max(1,Math.round(limit*s.q/denominator));out.push(...shuffle(base.filter(q=>q.subject===s.id)).slice(0,take))});
      const unique=[...new Map(out.map(q=>[q.id,q])).values()];
      if(unique.length<limit){const remaining=shuffle(base.filter(q=>!unique.some(u=>u.id===q.id)));unique.push(...remaining.slice(0,limit-unique.length));}
      return shuffle(unique).slice(0,limit);
    }
    return shuffle(base).slice(0,limit);
  }

  function startSession(mode=selectedMode,limit=Number($('questionLimit').value||10),subject=$('questionSubject').value||'all'){
    let qs=makePool(mode,limit,subject);
    if(!qs.length && mode==='review'){
      showNotice('Não há revisões vencidas. Iniciando bloco adaptativo.'); mode='adaptive'; qs=makePool(mode,limit,subject);
    }
    if(!qs.length){showNotice('Não há questões disponíveis neste filtro. Use a Central do Banco para ampliar a base.');return;}
    if(qs.length<limit)showNotice(`Este filtro tem apenas ${qs.length} questões únicas disponíveis no banco atual.`);
    session={mode,qs,index:0,answers:{},startedAt:now(),questionStartedAt:now()};
    $('sessionSetup').classList.add('hidden'); $('sessionResult').classList.add('hidden'); $('sessionArea').classList.remove('hidden');
    page('questions'); startTimer(); renderQuestion();
  }
  function startTimer(){ clearInterval(timerHandle); timerHandle=setInterval(()=>{if(!session)return;const sec=Math.floor((now()-session.startedAt)/1000);$('sessionTimer').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`},1000); }
  function renderQuestion(){
    const q=session.qs[session.index], ans=session.answers[q.id], answered=!!ans;
    $('sessionModeLabel').textContent=session.mode.toUpperCase(); $('sessionProgress').textContent=`Questão ${session.index+1} de ${session.qs.length}`;
    $('sessionDots').innerHTML=session.qs.map((x,i)=>`<button class="${i===session.index?'active':''} ${session.answers[x.id]?'done':''}" data-qindex="${i}">${i+1}</button>`).join('');
    $$('[data-qindex]').forEach(b=>b.onclick=()=>{session.index=+b.dataset.qindex;session.questionStartedAt=now();renderQuestion()});
    const s=subjectById(q.subject); $('questionSubjectLabel').textContent=s?.name||q.subject; $('questionTopicLabel').textContent=q.topic; $('questionText').textContent=q.text;
    $('answerList').innerHTML=q.options.map((o,i)=>{let cls='';if(answered){if(i===q.correct)cls='correct';else if(i===ans.choice&&!ans.correct)cls='wrong';}return `<button class="answer-option ${cls}" data-answer="${i}" ${answered?'disabled':''}><b>${String.fromCharCode(65+i)})</b> ${o}</button>`}).join('');
    $$('[data-answer]').forEach(b=>b.onclick=()=>answerQuestion(+b.dataset.answer));
    $('feedbackBox').classList.toggle('hidden',!answered); $('errorCauseBox').classList.toggle('hidden',!answered||ans.correct);
    if(answered){$('feedbackBox').className=`feedback-box ${ans.correct?'':'bad'}`;$('feedbackBox').textContent=`${ans.correct?'Correto.':'Errado.'} ${q.explanation}`;$$('[data-cause]').forEach(b=>b.classList.toggle('active',b.dataset.cause===ans.cause));}
    $('prevQuestion').disabled=session.index===0; $('nextQuestion').textContent=session.index===session.qs.length-1?'Finalizar':'Próxima →';
  }
  function answerQuestion(choice){
    const q=session.qs[session.index]; if(session.answers[q.id])return;
    const correct=choice===q.correct; const elapsed=now()-session.questionStartedAt;
    session.answers[q.id]={choice,correct,timeMs:elapsed,cause:null};
    state.attempts.push({qid:q.id,subject:q.subject,topic:q.topic,correct,choice,timeMs:elapsed,mode:session.mode,ts:now(),cause:null});
    updateReview(q,correct);
    persist(); renderQuestion(); renderAll();
  }
  function updateReview(q,correct){
    const r=state.reviews[q.id];
    if(!correct){ state.reviews[q.id]={qid:q.id,subject:q.subject,topic:q.topic,due:now()+day,interval:1,streak:0,mastered:false,lastResult:false,lastSeen:now(),cause:r?.cause||null}; return; }
    if(r){
      const intervals=[3,7,14,30,60]; const streak=(r.streak||0)+1; const interval=intervals[Math.min(streak-1,intervals.length-1)];
      state.reviews[q.id]={...r,due:now()+interval*day,interval,streak,mastered:streak>=4,lastResult:true,lastSeen:now()};
    }
  }
  function setCause(cause){
    if(!session)return; const q=session.qs[session.index], ans=session.answers[q.id]; if(!ans||ans.correct)return;
    ans.cause=cause;
    const last=[...state.attempts].reverse().find(a=>a.qid===q.id && a.ts>=session.startedAt); if(last)last.cause=cause;
    if(state.reviews[q.id])state.reviews[q.id].cause=cause;
    persist(); renderQuestion();
  }
  function nextQuestion(){
    if(!session)return; if(session.index===session.qs.length-1){finishSession();return;} session.index++;session.questionStartedAt=now();renderQuestion();
  }
  function finishSession(){
    if(!session)return; clearInterval(timerHandle);
    const answered=Object.values(session.answers), total=answered.length, correct=answered.filter(a=>a.correct).length, duration=now()-session.startedAt;
    state.sessions.unshift({id:`s-${now()}`,mode:session.mode,total,correct,duration,ts:now()}); state.sessions=state.sessions.slice(0,30); persist();
    $('sessionArea').classList.add('hidden'); $('sessionResult').classList.remove('hidden');
    const pct=total?Math.round(correct/total*100):0,o=overall();
    $('sessionResult').innerHTML=`<p class="eyebrow">BLOCO CONCLUÍDO</p><h2>${correct}/${total} acertos</h2><p class="muted">O resultado já foi incorporado à projeção e à fila de revisão.</p><div class="result-summary"><div><span>Aproveitamento</span><strong>${pct}%</strong></div><div><span>Tempo</span><strong>${Math.round(duration/60000)} min</strong></div><div><span>Erros gerados</span><strong>${total-correct}</strong></div><div><span>P(≥40)</span><strong>${o.total<20?'—':fmtPct(o.passProbability)}</strong></div></div><div class="actions-row"><button class="btn primary" id="resultNext">Novo bloco adaptativo</button><button class="btn secondary" id="resultDash">Voltar ao painel</button></div>`;
    $('resultNext').onclick=()=>{resetSessionUI();startSession('adaptive')}; $('resultDash').onclick=()=>{resetSessionUI();page('dashboard')};
    session=null; renderAll();
  }
  function resetSessionUI(){$('sessionSetup').classList.remove('hidden');$('sessionArea').classList.add('hidden');$('sessionResult').classList.add('hidden')}

  function renderReviews(){
    const values=Object.values(state.reviews).filter(r=>!r.mastered).sort((a,b)=>a.due-b.due); const due=values.filter(r=>r.due<=now()); const week=values.filter(r=>r.due>now()&&r.due<=now()+7*day);
    $('reviewDue').textContent=due.length; $('reviewWeek').textContent=week.length; $('errorKnowledge').textContent=values.filter(r=>r.cause==='knowledge').length; $('errorReading').textContent=values.filter(r=>r.cause==='reading').length;
    $('reviewList').innerHTML=values.length?values.slice(0,30).map(r=>{const q=questionById(r.qid),s=subjectById(r.subject);return `<div class="review-item"><div><strong>${s?.name||r.subject} • ${r.topic}</strong><small>${q?.text||'Questão não disponível no banco atual'} • sequência ${r.streak||0}/4</small></div><span class="due-tag">${dueLabel(r.due)}</span></div>`}).join(''):'<div class="muted">Nenhum erro aberto. Quando uma questão for errada, ela entra automaticamente aqui.</div>';
  }

  function renderAnalytics(){
    const rows=SUBJECTS.map(s=>({s,st:stats(s.id)}));
    $('analyticsBody').innerHTML=rows.map(x=>`<tr><td><strong>${x.s.name}</strong></td><td>${x.s.q}/80</td><td>${x.st.n}</td><td>${x.st.n?fmtPct(x.st.raw):'—'}</td><td>${fmtPct(x.st.estimated)}</td><td>+${x.st.potential.toFixed(1)}</td><td><span class="priority-pill">${x.s.core?Math.round(x.st.focus):'complementar'}</span></td></tr>`).join('');
    const causes={knowledge:0,confusion:0,reading:0}; state.attempts.filter(a=>!a.correct&&a.cause).forEach(a=>causes[a.cause]++);
    $('causeBreakdown').innerHTML=`<div class="cause-card"><strong>${causes.knowledge}</strong><span>Não sabia a regra</span></div><div class="cause-card"><strong>${causes.confusion}</strong><span>Confusão conceitual</span></div><div class="cause-card"><strong>${causes.reading}</strong><span>Leitura/atenção</span></div>`;
    $('sessionHistory').innerHTML=state.sessions.length?state.sessions.slice(0,8).map(s=>`<div class="history-item"><strong>${s.mode} • ${s.correct}/${s.total}</strong><span>${new Date(s.ts).toLocaleDateString('pt-BR')} • ${Math.round(s.duration/60000)} min</span></div>`).join(''):'<div class="muted">Nenhum bloco concluído ainda.</div>';
  }

  function renderAll(){ renderDashboard(); renderPlan(); renderStudy(); renderReviews(); renderAnalytics(); }
  function showNotice(msg){$('notice').textContent=msg;$('notice').classList.remove('hidden');setTimeout(()=>$('notice').classList.add('hidden'),5000)}
  function installBankLink(){
    const nav=document.querySelector('.nav'); if(!nav||document.querySelector('a[href="bank.html"]'))return;
    const tutor=nav.querySelector('a[href="ia.html"]'); const a=document.createElement('a'); a.className='nav-item nav-link';a.href='bank.html';a.innerHTML='<span>▦</span>Banco de questões';nav.insertBefore(a,tutor||null);
  }

  function bind(){
    $$('.nav-item[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page)); $$('[data-go-page]').forEach(b=>b.onclick=()=>page(b.dataset.goPage));
    $('quickStudy').onclick=()=>startSession('adaptive'); $('heroAdaptive').onclick=()=>startSession('adaptive'); $('routineStart').onclick=()=>startSession('adaptive');
    $('heroDiagnostic').onclick=()=>startSession('core',10,'all'); $('quickReview').onclick=()=>startSession('review',10,'all'); $('startDueReview').onclick=()=>startSession('review',10,'all');
    $('savePlan').onclick=()=>{state.profile.targetDate=$('targetDate').value||CFG.examDate;state.profile.targetScore=clamp(Number($('targetScore').value||45),40,70);state.profile.dailyMinutes=clamp(Number($('dailyMinutes').value||60),20,300);state.profile.strategy=$('strategy').value;persist();renderAll();showNotice('Estratégia atualizada.')};
    $$('[data-subject-filter]').forEach(b=>b.onclick=()=>{state.settings.subjectFilter=b.dataset.subjectFilter;persist();renderStudy()});
    $('trainSubject').onclick=()=>{page('questions');$('questionSubject').value=selectedSubject;selectedMode='core';startSession('core',10,selectedSubject)};
    $('diagnoseSubject').onclick=()=>{page('questions');$('questionSubject').value=selectedSubject;startSession('core',5,selectedSubject)};
    $$('[data-mode]').forEach(b=>b.onclick=()=>{selectedMode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b))});
    $('startSession').onclick=()=>startSession(selectedMode,Number($('questionLimit').value),$('questionSubject').value);
    $('prevQuestion').onclick=()=>{if(session&&session.index>0){session.index--;session.questionStartedAt=now();renderQuestion()}}; $('nextQuestion').onclick=nextQuestion; $('finishSession').onclick=finishSession;
    $$('[data-cause]').forEach(b=>b.onclick=()=>setCause(b.dataset.cause));
    $('loginGoogle').onclick=loginGoogle; $('logoutGoogle').onclick=()=>auth?.signOut();
  }

  async function loadQuestionBank(){
    try{
      const bank=await import('./question-bank.js'); const imported=await bank.getAllQuestions();
      const merged=new Map(BUILTIN_QUESTIONS.map(q=>[q.id,q])); imported.forEach(q=>merged.set(q.id,q)); QUESTIONS=[...merged.values()];
      return imported.length;
    }catch(e){console.warn('Banco IndexedDB indisponível',e);QUESTIONS=[...BUILTIN_QUESTIONS];return 0;}
  }

  async function initFirebase(){
    try{
      if(!window.firebase || !window.OAB_FIREBASE_CONFIG) return;
      if(!firebase.apps.length) firebase.initializeApp(window.OAB_FIREBASE_CONFIG);
      auth=firebase.auth(); db=firebase.firestore();
      auth.onAuthStateChanged(async user=>{
        currentUser=user;
        if(!user){$('userName').textContent=state.profile.name||'Usuário local';$('userAvatar').textContent=(state.profile.name||'U')[0].toUpperCase();$('syncStatus').textContent='Dados salvos neste navegador';$('loginGoogle').classList.remove('hidden');$('logoutGoogle').classList.add('hidden');return;}
        $('userName').textContent=user.displayName||user.email||'Conta Google';$('userAvatar').textContent=(user.displayName||user.email||'U')[0].toUpperCase();$('syncStatus').textContent='Sincronizando…';$('loginGoogle').classList.add('hidden');$('logoutGoogle').classList.remove('hidden');
        try{
          const doc=await db.collection('users').doc(user.uid).collection('state').doc('main').get();
          if(doc.exists){const cloud=doc.data(); if((cloud.updatedAt||0)>(state.updatedAt||0)){state={...defaultState(),...cloud,profile:{...defaultState().profile,...(cloud.profile||{})},settings:{...defaultState().settings,...(cloud.settings||{})}};localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}}
          else await db.collection('users').doc(user.uid).collection('state').doc('main').set(state);
          $('syncStatus').textContent='Sincronizado com a nuvem';renderAll();
        }catch(e){$('syncStatus').textContent='Conta conectada • modo local';}
      });
    }catch(e){ console.warn('Firebase indisponível',e); }
  }
  async function loginGoogle(){
    if(!auth){showNotice('Firebase não carregou. O sistema continua funcionando localmente.');return;}
    try{const provider=new firebase.auth.GoogleAuthProvider();await auth.signInWithPopup(provider)}catch(e){showNotice('Não foi possível concluir o login Google.')}
  }

  async function bootstrap(){
    const imported=await loadQuestionBank(); installBankLink(); renderQuestionSelectors(); bind(); renderAll(); initFirebase();
    if(imported)showNotice(`Banco ampliado: ${imported} questões importadas carregadas.`);
  }
  bootstrap();
})();
