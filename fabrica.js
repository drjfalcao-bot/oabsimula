import { invalidateCloudCache } from './question-bank.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let auth,functions,batch=[],batchId=null,bulkRunning=false;

function init(){
  $('subject').innerHTML=window.OAB_SUBJECTS.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  try{
    if(!firebase.apps.length)firebase.initializeApp(window.OAB_FIREBASE_CONFIG);
    auth=firebase.auth();
    functions=firebase.app().functions('southamerica-east1');
    auth.onAuthStateChanged(u=>{$('status').textContent=u?'Conectado: '+(u.displayName||u.email):'Entre com Google no Tutor IA antes de gerar.'});
  }catch(e){$('status').textContent='Firebase indisponível.'}
}
function inputs(quantity){return {subject:$('subject').value,topic:$('topic').value,difficulty:Number($('difficulty').value),quantity,mode:$('mode').value}}
function summarize(data){
  const q=Array.isArray(data?.questions)?data.questions:[];
  const ready=Number(data?.quality?.ready??q.filter(x=>x.validation?.readyToPublish).length),blocked=q.length-ready;
  $('qTotal').textContent=q.length;$('qReady').textContent=ready;$('qBlocked').textContent=blocked;
  const issues={};q.forEach(x=>(x.validation?.issues||[]).forEach(i=>issues[i]=(issues[i]||0)+1));
  const issueText=Object.entries(issues).map(([k,v])=>`${k}: ${v}`).join(' • ');
  $('quality').innerHTML=`<strong>Motor V${data?.quality?.engineVersion||3}:</strong> ${ready}/${q.length} passaram no corte.${issueText?`<br><span class="muted">${esc(issueText)}</span>`:''}`;
}
async function generateOne(quantity){
  if(!auth?.currentUser)throw new Error('Entre com Google antes de gerar.');
  const call=functions.httpsCallable('generateGroundedQuestionBatch');
  const r=await call(inputs(quantity));
  return r.data||{};
}
async function publish(id){
  if(!id)throw new Error('Lote sem identificador.');
  const call=functions.httpsCallable('publishGroundedQuestionBatch');
  const r=await call({batchId:id});invalidateCloudCache();return r.data||{};
}
$('generate').onclick=async()=>{
  if(!auth?.currentUser){alert('Entre com Google no Tutor IA.');return}
  const b=$('generate');b.disabled=true;b.textContent='Pesquisando e auditando…';
  try{
    const data=await generateOne(Number($('qty').value));batch=Array.isArray(data.questions)?data.questions:[];batchId=data.batchId||null;
    $('preview').textContent=JSON.stringify({batchId,questions:batch},null,2);summarize(data);
    $('save').disabled=!batchId||!batch.some(q=>q.validation?.readyToPublish);$('discard').disabled=!batch.length;
  }catch(e){$('quality').textContent='Falha ao gerar lote: '+(e.message||e)}finally{b.disabled=false;b.textContent='Gerar + pesquisar + auditar'}
};
$('save').onclick=async()=>{
  if(!batchId)return;const b=$('save');b.disabled=true;b.textContent='Publicando…';
  try{const r=await publish(batchId);$('quality').innerHTML=`<strong>${Number(r.published||0)} questões publicadas no banco central.</strong> ${Number(r.skipped||0)} duplicatas foram ignoradas.`;batch=[];batchId=null;$('preview').textContent='[]';$('discard').disabled=true}
  catch(e){$('quality').textContent='Falha ao publicar: '+(e.message||e);b.disabled=false}
  finally{b.textContent='Publicar aprovadas no banco central'}
};
$('discard').onclick=()=>{batch=[];batchId=null;$('preview').textContent='[]';$('quality').textContent='Lote descartado.';$('qTotal').textContent='0';$('qReady').textContent='0';$('qBlocked').textContent='0';$('save').disabled=true;$('discard').disabled=true};
$('bulk').onclick=async()=>{
  if(bulkRunning)return;if(!auth?.currentUser){alert('Entre com Google antes de iniciar a produção em escala.');return}
  const target=Math.max(1,Number($('bulkQty').value)||100),b=$('bulk');bulkRunning=true;b.disabled=true;b.textContent='Produzindo…';
  let requested=0,published=0,blocked=0,duplicates=0,cycles=0;
  try{
    while(requested<target){
      const qty=Math.min(20,target-requested);cycles++;
      $('bulkStatus').textContent=`Lote ${cycles}: pesquisando fontes e auditando ${qty} questões…`;
      const data=await generateOne(qty);requested+=qty;
      const ready=Number(data?.quality?.ready||0);blocked+=Math.max(0,qty-ready);
      if(data.batchId&&ready){
        $('bulkStatus').textContent=`Lote ${cycles}: ${ready} aprovadas; publicando no banco central…`;
        const pub=await publish(data.batchId);published+=Number(pub.published||0);duplicates+=Number(pub.skipped||0);
      }
      $('bulkBar').style.width=`${Math.min(100,(requested/target)*100)}%`;
      $('bulkStatus').textContent=`Processadas ${requested}/${target} • publicadas ${published} • bloqueadas ${blocked} • duplicatas ${duplicates}`;
    }
    $('bulkStatus').innerHTML=`<strong>Produção concluída.</strong> ${published} novas questões entraram no banco central; ${blocked} foram barradas por qualidade e ${duplicates} por duplicidade.`;
  }catch(e){$('bulkStatus').textContent=`Produção interrompida após ${requested}/${target}: ${e.message||e}`}
  finally{bulkRunning=false;b.disabled=false;b.textContent='Produzir e publicar automaticamente'}
};

init();
