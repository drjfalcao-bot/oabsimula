const STATE_KEY='oab-aprova-premium-v1';

function readState(){
  try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{};}catch{return {};}
}
function hasDueReviews(){
  const state=readState();
  return Object.values(state.reviews||{}).some(r=>!r.mastered&&Number(r.due||0)<=Date.now());
}
function openGuidedReview(){
  location.href='questao-guiada.html?priority=review&origin=all&due=1';
}

// A revisão de erro exige diagnóstico e remediação; o treino resumido do painel
// continua válido para blocos comuns, mas não para reincidência SRS.
document.addEventListener('click',event=>{
  const target=event.target.closest?.('#quickReview,#startDueReview,#startSession');
  if(!target)return;

  const direct=target.id==='quickReview'||target.id==='startDueReview';
  const reviewMode=target.id==='startSession'&&document.querySelector('[data-mode="review"]')?.classList.contains('active');
  if(!direct&&!reviewMode)return;
  if(!hasDueReviews())return; // deixa o app original informar/fazer fallback quando não há vencidas

  event.preventDefault();
  event.stopImmediatePropagation();
  openGuidedReview();
},true);
