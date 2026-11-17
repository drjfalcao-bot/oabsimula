import {OFFICIAL_FGV_EXAMS} from './official-fgv-bank.js';
import {LATEST_OFFICIAL_EXAM, LATEST_SECOND_PHASE} from './historical-exams.js';

const $=id=>document.getElementById(id);
const catalog={...OFFICIAL_FGV_EXAMS,[LATEST_OFFICIAL_EXAM.exam]:LATEST_OFFICIAL_EXAM};
const available=Object.keys(catalog).map(Number).sort((a,b)=>b-a);
const prefix='oab-aprova-history-v1:';
let current=available[0], answers={}, graded=false;

function load(){
  let saved={};try{saved=JSON.parse(localStorage.getItem(prefix+current)||'{}')}catch{}
  answers=saved.answers&&typeof saved.answers==='object'?saved.answers:{};
  graded=Boolean(saved.graded);
}
function save(){
  try{localStorage.setItem(prefix+current,JSON.stringify({answers,graded,updatedAt:new Date().toISOString()}));}catch{}
}
function meta(){return catalog[current]}
function validChoice(answer){return ['A','B','C','D'].includes(answer)}
function score(){
  const key=meta().key;
  const annulled=key.filter(x=>x==='*').length;
  const correct=key.filter((x,i)=>x!=='*'&&answers[i+1]===x).length;
  const attempted=key.filter((x,i)=>x!=='*'&&validChoice(answers[i+1])).length;
  return {correct,annulled,attempted,total:80,points:correct+annulled};
}
function renderGrid(){
  const key=meta().key;
  $('answerGrid').innerHTML=key.map((letter,i)=>{
    const n=i+1,annulled=letter==='*',answer=answers[n];
    const status=graded&&!annulled?(answer===letter?'right':'wrong'):'';
    const buttons=annulled?'<span class="answerkey">Anulada</span>':(['A','B','C','D'].map(c=>'<button type="button" data-num="'+n+'" data-choice="'+c+'" '+(graded?'disabled ':'')+'aria-pressed="'+(answer===c)+'" class="'+(answer===c?'selected':'')+'">'+c+'</button>').join(''));
    return '<div class="question '+(annulled?'annulled ':status)+'"><strong>'+String(n).padStart(2,'0')+'</strong><div class="choice">'+buttons+'</div>'+(graded&&!annulled?'<span class="answerkey">✓ '+letter+'</span>':'')+'</div>';
  }).join('');
  $('answerGrid').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{
    answers[b.dataset.num]=b.dataset.choice;save();renderGrid();renderProgress();
  }));
  $('grade').disabled=graded;
}
function renderProgress(){
  const s=score();
  $('progress').textContent=s.attempted+'/ '+(s.total-s.annulled)+' válidas respondidas • '+s.annulled+' anulada(s)';
  $('result').textContent=graded?('Nota: '+s.points+'/80 ('+s.correct+' acertos + '+s.annulled+' anulação(ões)). '+(s.points>=40?'Atingiu o mínimo de 40 pontos.':'Abaixo de 40 pontos.')+' As respostas corretas estão indicadas em verde, as demais em vermelho.'):('Questões respondidas: '+s.attempted+'. O gabarito aparece após a correção.');
}
function setExam(id){
  if(!catalog[id])return;
  current=Number(id);load();
  const m=meta();if(!Array.isArray(m.key)||m.key.length!==80)throw new Error('Gabarito inconsistente: '+current);
  $('examSelector').value=String(current);
  $('examDescription').textContent=current+'º Exame • '+new Date(m.examDate+'T12:00:00').toLocaleDateString('pt-BR')+' • '+m.key.filter(x=>x==='*').length+' anulada(s)';
  $('openPaper').href=m.questionPdf;
  $('openKey').href=m.keyPdf;
  $('examPdf').src=m.questionPdf+'#toolbar=1';
  renderGrid();renderProgress();
}
$('examSelector').innerHTML=available.map(exam=>'<option value="'+exam+'">'+exam+'º EOU — '+catalog[exam].year+'</option>').join('');
$('examSelector').onchange=e=>setExam(e.target.value);
$('grade').onclick=()=>{
  if(graded)return;
  if(!confirm('Corrigir este cartão-resposta? A tentativa ficará bloqueada até escolher Nova tentativa.'))return;
  graded=true;save();renderGrid();renderProgress();
};
$('reset').onclick=()=>{
  if(!confirm('Iniciar nova tentativa para este exame? As respostas anteriores deste exame serão substituídas.'))return;
  answers={};graded=false;save();renderGrid();renderProgress();
};
$('secondPhaseLinks').innerHTML=LATEST_SECOND_PHASE.map(a=>'<a href="'+a.url+'" target="_blank" rel="noopener">'+a.name+' — espelho</a>').join('');
setExam(current);
