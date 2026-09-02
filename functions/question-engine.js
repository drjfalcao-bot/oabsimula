import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import crypto from 'node:crypto';

if (!getApps().length) initializeApp();
const db = getFirestore();
const openaiKey = defineSecret('OPENAI_API_KEY');

const SUBJECTS = {
  etica:'Ética Profissional', filosofia:'Filosofia do Direito', constitucional:'Direito Constitucional', humanos:'Direitos Humanos', eleitoral:'Direito Eleitoral', internacional:'Direito Internacional', financeiro:'Direito Financeiro', tributario:'Direito Tributário', administrativo:'Direito Administrativo', ambiental:'Direito Ambiental', civil:'Direito Civil', eca:'ECA', consumidor:'Direito do Consumidor', empresarial:'Direito Empresarial', 'processo-civil':'Processo Civil', penal:'Direito Penal', 'processo-penal':'Processo Penal', previdenciario:'Direito Previdenciário', trabalho:'Direito do Trabalho', 'processo-trabalho':'Processo do Trabalho'
};

const SOURCE_POLICIES = {
  etica:{domains:['oab.org.br'],hint:'Estatuto da Advocacia, Regulamento Geral, Código de Ética, Provimentos e Resoluções do CFOAB.'},
  filosofia:{domains:['scielo.br','senado.leg.br','camara.leg.br','stf.jus.br'],hint:'Fontes acadêmicas ou institucionais identificáveis; não invente atribuições doutrinárias.'},
  constitucional:{domains:['planalto.gov.br','stf.jus.br'],hint:'Constituição compilada, legislação constitucional e jurisprudência oficial do STF.'},
  humanos:{domains:['planalto.gov.br','oas.org','corteidh.or.cr','ohchr.org'],hint:'Constituição, tratados promulgados no Brasil, sistema interamericano e ONU.'},
  eleitoral:{domains:['tse.jus.br','planalto.gov.br'],hint:'Código Eleitoral, legislação eleitoral e jurisprudência/súmulas do TSE.'},
  internacional:{domains:['planalto.gov.br','gov.br','itamaraty.gov.br','un.org'],hint:'Tratados promulgados, legislação brasileira e fontes diplomáticas/internacionais oficiais.'},
  financeiro:{domains:['planalto.gov.br','tesouro.gov.br','gov.br'],hint:'Constituição financeira, Lei 4.320/1964, LRF e fontes oficiais de finanças públicas.'},
  tributario:{domains:['planalto.gov.br','stf.jus.br','stj.jus.br'],hint:'Constituição, CTN, leis tributárias e jurisprudência consolidada dos tribunais superiores.'},
  administrativo:{domains:['planalto.gov.br','stf.jus.br','stj.jus.br','gov.br'],hint:'Constituição, Lei 14.133/2021, processo administrativo e jurisprudência consolidada.'},
  ambiental:{domains:['planalto.gov.br','gov.br','ibama.gov.br','stj.jus.br'],hint:'Constituição, legislação ambiental federal, fontes ambientais oficiais e jurisprudência consolidada.'},
  civil:{domains:['planalto.gov.br','stj.jus.br'],hint:'Código Civil e jurisprudência consolidada do STJ.'},
  eca:{domains:['planalto.gov.br','stj.jus.br','cnj.jus.br'],hint:'ECA, legislação correlata e jurisprudência/fonte institucional.'},
  consumidor:{domains:['planalto.gov.br','stj.jus.br'],hint:'CDC e jurisprudência consolidada do STJ.'},
  empresarial:{domains:['planalto.gov.br','stj.jus.br'],hint:'Código Civil empresarial, Lei 11.101/2005, legislação societária e jurisprudência consolidada.'},
  'processo-civil':{domains:['planalto.gov.br','stj.jus.br','stf.jus.br'],hint:'CPC e jurisprudência consolidada dos tribunais superiores.'},
  penal:{domains:['planalto.gov.br','stj.jus.br','stf.jus.br'],hint:'Código Penal, legislação penal especial e jurisprudência consolidada.'},
  'processo-penal':{domains:['planalto.gov.br','stj.jus.br','stf.jus.br'],hint:'CPP, legislação processual penal e jurisprudência consolidada.'},
  previdenciario:{domains:['planalto.gov.br','gov.br','stj.jus.br'],hint:'Leis 8.212/1991 e 8.213/1991, regulamentos e jurisprudência consolidada.'},
  trabalho:{domains:['planalto.gov.br','tst.jus.br','stf.jus.br'],hint:'CLT, Constituição e jurisprudência consolidada do TST/STF.'},
  'processo-trabalho':{domains:['planalto.gov.br','tst.jus.br','stf.jus.br'],hint:'CLT processual, legislação correlata e jurisprudência consolidada do TST/STF.'}
};

const FGV_DOMAIN = 'conhecimento.fgv.br';
const CRITICAL_ISSUES = new Set([
  'gabarito_invalido','alternativas_invalidas','alternativas_duplicadas','fonte_ausente','fonte_nao_confiavel','fundamento_ausente','verificacao_falhou','enunciado_ausente'
]);

function client(){ return new OpenAI({apiKey:openaiKey.value()}); }
function bounded(v,max){ return String(v ?? '').trim().slice(0,max); }
function requireAuth(request){ if(!request.auth) throw new HttpsError('unauthenticated','Entre com Google para usar a fábrica de questões.'); return request.auth.uid; }
function dateKey(){ return new Date().toISOString().slice(0,10); }
function cleanJson(text){
  let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a>=0&&b>a) s=s.slice(a,b+1);
  try{return JSON.parse(s)}catch{throw new HttpsError('internal','A IA devolveu JSON inválido. Gere o lote novamente.');}
}
async function consume(uid,key,amount,limit){
  const ref=db.doc(`users/${uid}/usage/${dateKey()}`);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref), used=Number(snap.exists?snap.data()?.[key]||0:0);
    if(used+amount>limit) throw new HttpsError('resource-exhausted',`Limite diário de ${limit} questões atingido.`);
    tx.set(ref,{[key]:FieldValue.increment(amount),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
}
function hostOf(url){ try{return new URL(String(url)).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';} }
function domainAllowed(url,domains){
  const host=hostOf(url);
  return !!host && domains.some(d=>host===d||host.endsWith(`.${d}`));
}
function normalizedText(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
function fingerprint(q){
  const body=[q.subject,q.topic,q.text,...(q.options||[])].map(normalizedText).join('|');
  return crypto.createHash('sha256').update(body).digest('hex');
}
function tokenSet(value){ return new Set(normalizedText(value).split(' ').filter(x=>x.length>3)); }
function jaccard(a,b){
  const A=tokenSet(a),B=tokenSet(b); if(!A.size||!B.size)return 0;
  let intersection=0; for(const x of A)if(B.has(x))intersection++;
  return intersection/(A.size+B.size-intersection);
}
function rebalanceAnswers(qs){
  const targets=Array.from({length:qs.length},(_,i)=>i%4).sort(()=>Math.random()-.5);
  return qs.map((q,i)=>{
    const c=Number(q.correct); if(!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(c)||c<0||c>3)return q;
    const right=q.options[c], wrong=q.options.filter((_,idx)=>idx!==c).sort(()=>Math.random()-.5), options=[];let w=0;
    for(let p=0;p<4;p++)options[p]=p===targets[i]?right:wrong[w++];
    return {...q,options,correct:targets[i]};
  });
}
function sourceList(q){
  const raw=[];
  if(Array.isArray(q.sources)) raw.push(...q.sources);
  if(Array.isArray(q.legalBasis)) raw.push(...q.legalBasis);
  if(q.sourceUrl) raw.push({url:q.sourceUrl,title:q.sourceTitle||q.sourceUrl});
  const seen=new Set(), out=[];
  for(const item of raw){
    const url=bounded(typeof item==='string'?item:item?.url,800); if(!url||seen.has(url))continue;
    seen.add(url); out.push({url,title:bounded(typeof item==='string'?url:item?.title||item?.label||url,240),kind:bounded(typeof item==='object'?item?.kind:'',80)});
  }
  return out.slice(0,8);
}
function legalBasis(q){
  const raw=Array.isArray(q.legalBasis)?q.legalBasis:[];
  return raw.slice(0,8).map(x=>typeof x==='string'?{label:bounded(x,300),url:''}:{label:bounded(x?.label||x?.title,300),url:bounded(x?.url,800)}).filter(x=>x.label||x.url);
}
function structuralIssues(q,domains,difficulty){
  const issues=[]; const text=bounded(q?.text,5000), options=Array.isArray(q?.options)?q.options.map(x=>bounded(x,1200)):[], correct=Number(q?.correct);
  if(!text)issues.push('enunciado_ausente'); else if(text.length<(difficulty>=4?150:110))issues.push('enunciado_curto');
  if(options.length!==4||options.some(x=>x.length<10))issues.push('alternativas_invalidas');
  if(!Number.isInteger(correct)||correct<0||correct>3)issues.push('gabarito_invalido');
  if(options.length===4){
    const norm=options.map(normalizedText); if(new Set(norm).size<4)issues.push('alternativas_duplicadas');
    if(Number.isInteger(correct)&&correct>=0&&correct<4){
      const lens=options.map(x=>x.length), corr=lens[correct], others=lens.filter((_,i)=>i!==correct), avg=lens.reduce((a,b)=>a+b,0)/4;
      if(corr>Math.max(...others)*1.28&&corr>avg*1.20)issues.push('correta_outlier_comprimento');
      if(Math.max(...lens)>Math.max(90,Math.min(...lens)*2.4))issues.push('alternativas_desequilibradas');
    }
  }
  if(bounded(q?.explanation,4000).length<100)issues.push('explicacao_curta');
  const sources=sourceList(q); if(!sources.length)issues.push('fonte_ausente');
  if(sources.length&&!sources.some(s=>domainAllowed(s.url,domains)))issues.push('fonte_nao_confiavel');
  const basis=legalBasis(q); if(!basis.length||!basis.some(b=>b.label.length>=6))issues.push('fundamento_ausente');
  if(q?.verified!==true && q?.verification?.verified!==true)issues.push('verificacao_falhou');
  return [...new Set(issues)];
}
function qualityScore(issues){
  let score=100;
  for(const i of issues){
    if(CRITICAL_ISSUES.has(i))score-=22;
    else if(i==='correta_outlier_comprimento'||i==='alternativas_desequilibradas')score-=10;
    else score-=5;
  }
  return Math.max(0,score);
}
function collectSearchSources(response){
  const out=[];
  for(const item of response?.output||[]){
    if(item?.type!=='web_search_call')continue;
    const list=item?.action?.sources||item?.sources||[];
    for(const s of list){const url=bounded(s?.url,800);if(url)out.push({url,title:bounded(s?.title||url,240)});}
  }
  return out;
}
function normalizeQuestion(q,{subject,topic,difficulty,domains,searchSources,index}){
  const explicit=sourceList(q); const fallback=searchSources.filter(s=>domainAllowed(s.url,domains)).slice(0,3);
  const sources=explicit.length?explicit:fallback;
  const basis=legalBasis(q);
  const normalized={
    id:`ai-${subject}-${Date.now()}-${index}-${crypto.randomBytes(3).toString('hex')}`,
    subject,
    topic:bounded(q?.topic||topic||'Geral',160),
    text:bounded(q?.text,5000),
    options:Array.isArray(q?.options)?q.options.slice(0,4).map(x=>bounded(x,1200)):[],
    correct:Number(q?.correct),
    explanation:bounded(q?.explanation,4000),
    difficulty,
    origin:'generated',
    sourceType:'autoral-grounded',
    sources,
    legalBasis:basis,
    verified:q?.verified===true||q?.verification?.verified===true,
    verification:{
      verified:q?.verified===true||q?.verification?.verified===true,
      confidence:Math.max(0,Math.min(1,Number(q?.confidence??q?.verification?.confidence??0))),
      note:bounded(q?.verification?.note||q?.verificationNote,600)
    },
    engineVersion:3,
    createdAt:Date.now()
  };
  normalized.fingerprint=fingerprint(normalized);
  const issues=structuralIssues(normalized,domains,difficulty);
  normalized.validation={status:'ai-validated',score:qualityScore(issues),issues,readyToPublish:qualityScore(issues)>=90&&!issues.some(i=>CRITICAL_ISSUES.has(i))};
  return normalized;
}
async function recentSubjectTexts(subject){
  try{
    const snap=await db.collection('question_bank').where('subject','==',subject).limit(350).get();
    return snap.docs.map(d=>({id:d.id,text:bounded(d.data()?.text,5000)}));
  }catch{return [];}
}
function markSemanticDuplicates(qs,existing){
  const accepted=[];
  for(const q of qs){
    let duplicate=false;
    for(const e of existing){if(jaccard(q.text,e.text)>=0.82){duplicate=true;break;}}
    if(!duplicate)for(const e of accepted){if(jaccard(q.text,e.text)>=0.82){duplicate=true;break;}}
    if(duplicate){q.validation.issues=[...new Set([...(q.validation.issues||[]),'possivel_duplicata_semantica'])];q.validation.score=Math.max(0,q.validation.score-18);q.validation.readyToPublish=false;}
    accepted.push(q);
  }
  return accepted;
}

export const generateGroundedQuestionBatch = onCall({region:'southamerica-east1',secrets:[openaiKey],timeoutSeconds:180,memory:'1GiB'}, async request=>{
  const uid=requireAuth(request);
  const subject=bounded(request.data?.subject,40), topic=bounded(request.data?.topic,160), difficulty=Math.max(1,Math.min(5,Number(request.data?.difficulty||3))), quantity=Math.max(1,Math.min(20,Number(request.data?.quantity||10)));
  const mode=['mixed','normative','jurisprudence','fgv-calibrated'].includes(request.data?.mode)?request.data.mode:'mixed';
  if(!SUBJECTS[subject]||!SOURCE_POLICIES[subject])throw new HttpsError('invalid-argument','Matéria inválida.');
  await consume(uid,'groundedGenerated',quantity,500);
  const policy=SOURCE_POLICIES[subject], legalDomains=[...policy.domains], searchDomains=mode==='fgv-calibrated'?[...new Set([...legalDomains,FGV_DOMAIN])]:legalDomains;
  const difficultyGuide={1:'regra central aplicada diretamente',2:'caso simples com uma distinção relevante',3:'padrão médio FGV, caso concreto e distratores próximos',4:'duas etapas de raciocínio e detalhe fático decisivo',5:'discriminação fina entre regra, exceção, competência, prazo ou efeito jurídico'}[difficulty];

  const prompt=`Produza ${quantity} questões AUTORAIS para a 1ª fase da OAB, matéria ${SUBJECTS[subject]}${topic?`, tema ${topic}`:''}, dificuldade ${difficulty}/5 (${difficultyGuide}).\n\nANTES DE ESCREVER, use busca web para localizar fonte jurídica real e atual. Fontes preferidas: ${policy.hint} Domínios permitidos para fundamento: ${legalDomains.join(', ')}.${mode==='fgv-calibrated'?' Você pode consultar conhecimento.fgv.br SOMENTE para calibrar arquitetura, densidade e estilo de prova; não copie nem parafraseie questões oficiais.':''}\n\nREGRAS DE CONTEÚDO:\n1) Cada questão deve nascer de uma regra, exceção, requisito, prazo, competência ou tese consolidada encontrável na fonte citada.\n2) Exatamente uma alternativa defensável. Três distratores plausíveis, falsos por detalhe jurídico identificável.\n3) Enunciado preferencialmente casuístico. Dificuldade vem do raciocínio jurídico, não de obscuridade.\n4) Não invente artigo, súmula, precedente ou URL. Evite tese controvertida sem sinalizar.\n5) Não copie questão da FGV, curso, site de questões ou banco comercial.\n6) Alternativas visualmente comparáveis; não denuncie a correta pelo tamanho ou tecnicidade.\n7) explanation deve explicar a regra e o erro dos principais distratores.\n8) Para CADA questão, inclua legalBasis com pelo menos um objeto {label,url}; a URL deve ser a página oficial efetivamente consultada. Inclua sources [{title,url,kind}].\n\nRetorne SOMENTE JSON: {"questions":[{"topic":"...","text":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","legalBasis":[{"label":"artigo/súmula/tese identificável","url":"https://..."}],"sources":[{"title":"...","url":"https://...","kind":"legislação|jurisprudência|norma OAB|referência FGV"}]}]}.`;

  const draft=await client().responses.create({
    model:'gpt-5.6-luna',
    reasoning:{effort:'medium'},
    tools:[{type:'web_search_preview',search_context_size:'medium',domains:searchDomains}],
    tool_choice:'required',
    include:['web_search_call.action.sources'],
    input:[{role:'system',content:'Você é redator jurídico de questões OAB. Pesquise antes de redigir. Só use fundamentos verificáveis em fontes reais. Não reproduza questões protegidas.'},{role:'user',content:prompt}],
    max_output_tokens:12000
  });
  const draftData=cleanJson(draft.output_text), draftQs=Array.isArray(draftData.questions)?draftData.questions.slice(0,quantity):[];
  if(!draftQs.length)throw new HttpsError('internal','Nenhuma questão foi gerada.');
  const draftSearchSources=collectSearchSources(draft).filter(s=>domainAllowed(s.url,searchDomains));

  const auditPrompt=`Atue como revisor jurídico independente da OAB. Use busca web para VALIDAR o lote abaixo contra as fontes primárias. Corrija o item quando necessário.\n\nCritérios obrigatórios: exatamente uma resposta correta; fundamento vigente; URL real em domínio permitido (${legalDomains.join(', ')}); legalBasis coerente com a resposta; distratores juridicamente plausíveis; sem pista de comprimento; sem ambiguidade. FGV pode ser referência de estilo, nunca fundamento jurídico.\n\nPara cada item devolva os mesmos campos e acrescente "verified":true somente se o fundamento e o gabarito forem confirmados pela fonte consultada; "confidence" entre 0 e 1; "verificationNote" curta. Se não conseguir verificar, use verified=false. Retorne SOMENTE {"questions":[...]}.\n\nLOTE: ${JSON.stringify({subject:SUBJECTS[subject],questions:draftQs}).slice(0,70000)}`;
  const audit=await client().responses.create({
    model:'gpt-5.6-terra',
    reasoning:{effort:'high'},
    tools:[{type:'web_search_preview',search_context_size:'medium',domains:legalDomains}],
    tool_choice:'required',
    include:['web_search_call.action.sources'],
    input:[{role:'system',content:'Você é editor técnico e verificador jurídico. Não aprove item sem conferir uma fonte real. Corrija conteúdo, não apenas redação.'},{role:'user',content:auditPrompt}],
    max_output_tokens:14000
  });
  const auditData=cleanJson(audit.output_text), reviewed=Array.isArray(auditData.questions)&&auditData.questions.length?auditData.questions:draftQs;
  const auditSearchSources=collectSearchSources(audit).filter(s=>domainAllowed(s.url,legalDomains));
  const allSearchSources=[...draftSearchSources,...auditSearchSources];
  let questions=reviewed.slice(0,quantity).map((q,i)=>normalizeQuestion(q,{subject,topic,difficulty,domains:legalDomains,searchSources:allSearchSources,index:i}));
  questions=rebalanceAnswers(questions).map(q=>{
    const issues=structuralIssues(q,legalDomains,difficulty); return {...q,fingerprint:fingerprint(q),validation:{status:'ai-validated',score:qualityScore(issues),issues,readyToPublish:qualityScore(issues)>=90&&!issues.some(i=>CRITICAL_ISSUES.has(i))}};
  });
  questions=markSemanticDuplicates(questions,await recentSubjectTexts(subject));
  const batchId=`batch-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
  const ready=questions.filter(q=>q.validation.readyToPublish).length;
  await db.collection('question_batches').doc(batchId).set({uid,subject,topic,difficulty,mode,questions,status:'pending-review',readyCount:ready,totalCount:questions.length,createdAt:FieldValue.serverTimestamp(),engineVersion:3});
  return {batchId,questions,quality:{ready,total:questions.length,blocked:questions.length-ready,engineVersion:3}};
});

export const publishGroundedQuestionBatch = onCall({region:'southamerica-east1',timeoutSeconds:90}, async request=>{
  const uid=requireAuth(request), batchId=bounded(request.data?.batchId,120);
  if(!batchId)throw new HttpsError('invalid-argument','batchId ausente.');
  const batchRef=db.collection('question_batches').doc(batchId), snap=await batchRef.get();
  if(!snap.exists)throw new HttpsError('not-found','Lote não encontrado.');
  const batch=snap.data(); if(batch.uid!==uid)throw new HttpsError('permission-denied','Este lote pertence a outro usuário.');
  if(batch.status==='published')return {published:Number(batch.publishedCount||0),skipped:Number(batch.skippedCount||0),alreadyPublished:true};
  const candidates=(Array.isArray(batch.questions)?batch.questions:[]).filter(q=>q?.validation?.readyToPublish===true);
  if(!candidates.length)throw new HttpsError('failed-precondition','Nenhuma questão deste lote passou no corte de qualidade.');

  const result=await db.runTransaction(async tx=>{
    const fpRefs=candidates.map(q=>db.collection('question_fingerprints').doc(q.fingerprint));
    const fpSnaps=[]; for(const ref of fpRefs)fpSnaps.push(await tx.get(ref));
    let published=0,skipped=0;
    for(let i=0;i<candidates.length;i++){
      const q=candidates[i]; if(fpSnaps[i].exists){skipped++;continue;}
      const qRef=db.collection('question_bank').doc(q.id);
      tx.set(qRef,{...q,status:'published',publishedAt:FieldValue.serverTimestamp(),publishedBy:uid,bankVersion:3});
      tx.set(fpRefs[i],{questionId:q.id,subject:q.subject,createdAt:FieldValue.serverTimestamp()});
      published++;
    }
    tx.set(batchRef,{status:'published',publishedCount:published,skippedCount:skipped,publishedAt:FieldValue.serverTimestamp()},{merge:true});
    return {published,skipped};
  });
  return result;
});

export const stageCentralQuestionImport = onCall({region:'southamerica-east1',timeoutSeconds:90}, async request=>{
  const uid=requireAuth(request), raw=Array.isArray(request.data?.questions)?request.data.questions:[];
  if(!raw.length||raw.length>250)throw new HttpsError('invalid-argument','Envie entre 1 e 250 questões por lote.');
  const questions=[];
  for(let i=0;i<raw.length;i++){
    const q=raw[i], subject=bounded(q?.subject,40); if(!SUBJECTS[subject])throw new HttpsError('invalid-argument',`Questão ${i+1}: matéria inválida.`);
    const policy=SOURCE_POLICIES[subject], official=Boolean(q?.official), sources=sourceList(q), basis=legalBasis(q);
    const item={id:bounded(q?.id,120)||`imp-${Date.now()}-${i}-${crypto.randomBytes(3).toString('hex')}`,subject,topic:bounded(q?.topic||'Geral',160),text:bounded(q?.text,5000),options:Array.isArray(q?.options)?q.options.slice(0,4).map(x=>bounded(x,1200)):[],correct:Number(q?.correct),explanation:bounded(q?.explanation,4000),difficulty:Math.max(1,Math.min(5,Number(q?.difficulty||3))),origin:official?'official-import':'user-import',sourceType:official?'fgv-official-user-provided':'autoral-importado',official,exam:bounded(q?.exam,50)||null,year:Number(q?.year)||null,sources,legalBasis:basis,verified:true,verification:{verified:true,confidence:1,note:'Importação fornecida pelo usuário; integridade estrutural validada pelo servidor.'},engineVersion:3,createdAt:Date.now()};
    item.fingerprint=fingerprint(item); const issues=structuralIssues(item,official?[...policy.domains,FGV_DOMAIN]:policy.domains,item.difficulty).filter(x=>x!=='verificacao_falhou');
    item.validation={status:'import-validated',score:qualityScore(issues),issues,readyToPublish:qualityScore(issues)>=85&&!issues.some(x=>CRITICAL_ISSUES.has(x))};
    questions.push(item);
  }
  const batchId=`import-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
  await db.collection('question_batches').doc(batchId).set({uid,questions,status:'pending-review',readyCount:questions.filter(q=>q.validation.readyToPublish).length,totalCount:questions.length,createdAt:FieldValue.serverTimestamp(),engineVersion:3,imported:true});
  return {batchId,questions,quality:{ready:questions.filter(q=>q.validation.readyToPublish).length,total:questions.length}};
});

export const getCentralQuestionBankStats = onCall({region:'southamerica-east1'}, async()=>{
  const snap=await db.collection('question_bank').where('status','==','published').get();
  const bySubject={},byOrigin={};
  for(const d of snap.docs){const q=d.data();bySubject[q.subject]=(bySubject[q.subject]||0)+1;byOrigin[q.origin||q.sourceType||'outro']=(byOrigin[q.origin||q.sourceType||'outro']||0)+1;}
  return {total:snap.size,bySubject,byOrigin,engineVersion:3};
});
