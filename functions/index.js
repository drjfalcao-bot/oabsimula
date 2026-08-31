import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";

initializeApp();
const db = getFirestore();
const openaiKey = defineSecret("OPENAI_API_KEY");

const SUBJECTS = {
  etica:'Ética Profissional', filosofia:'Filosofia do Direito', constitucional:'Direito Constitucional', humanos:'Direitos Humanos', eleitoral:'Direito Eleitoral', internacional:'Direito Internacional', financeiro:'Direito Financeiro', tributario:'Direito Tributário', administrativo:'Direito Administrativo', ambiental:'Direito Ambiental', civil:'Direito Civil', eca:'ECA', consumidor:'Direito do Consumidor', empresarial:'Direito Empresarial', 'processo-civil':'Processo Civil', penal:'Direito Penal', 'processo-penal':'Processo Penal', previdenciario:'Direito Previdenciário', trabalho:'Direito do Trabalho', 'processo-trabalho':'Processo do Trabalho'
};
const AREAS = {
  administrativo:'Direito Administrativo', civil:'Direito Civil', constitucional:'Direito Constitucional', trabalho:'Direito do Trabalho', empresarial:'Direito Empresarial', penal:'Direito Penal', tributario:'Direito Tributário'
};
const PIECES = {
  administrativo:['Mandado de Segurança','Ação Anulatória','Ação Ordinária / Obrigação de Fazer','Ação Popular','Ação Civil Pública','Ação Indenizatória','Ação de Desapropriação Indireta','Contestação','Apelação','Agravo de Instrumento','Embargos à Execução','Contrarrazões de Apelação','Recurso Ordinário Constitucional','Ação Rescisória'],
  civil:['Petição Inicial pelo Procedimento Comum','Contestação','Reconvenção','Apelação','Agravo de Instrumento','Embargos de Terceiro','Embargos à Execução','Impugnação ao Cumprimento de Sentença','Ação Rescisória','Ação Monitória','Ação de Consignação em Pagamento','Ação de Usucapião','Ação de Alimentos','Ação de Divórcio / Dissolução','Ação de Inventário / Partilha','Ação Possessória','Contrarrazões de Apelação'],
  constitucional:['Mandado de Segurança Individual','Mandado de Segurança Coletivo','Ação Direta de Inconstitucionalidade','Ação Declaratória de Constitucionalidade','Arguição de Descumprimento de Preceito Fundamental','Ação Direta de Inconstitucionalidade por Omissão','Mandado de Injunção Individual','Mandado de Injunção Coletivo','Ação Popular','Habeas Data','Reclamação Constitucional','Recurso Extraordinário','Recurso Ordinário Constitucional'],
  trabalho:['Reclamação Trabalhista','Contestação Trabalhista','Recurso Ordinário','Agravo de Petição','Embargos à Execução','Impugnação à Sentença de Liquidação','Recurso de Revista','Agravo de Instrumento em Recurso de Revista','Contrarrazões de Recurso Ordinário','Mandado de Segurança','Ação Rescisória','Inquérito para Apuração de Falta Grave','Consignação em Pagamento','Embargos de Terceiro Trabalhistas'],
  empresarial:['Petição Inicial pelo Procedimento Comum','Execução de Título Extrajudicial','Ação Monitória','Ação de Dissolução Parcial de Sociedade','Ação de Prestação de Contas','Pedido de Falência','Pedido de Recuperação Judicial','Habilitação de Crédito','Impugnação de Crédito','Contestação','Réplica','Apelação','Agravo de Instrumento','Embargos à Execução','Embargos de Terceiro','Cumprimento de Sentença','Contrarrazões','Recurso Especial','Ação de Anulação de Deliberação Societária'],
  penal:['Resposta à Acusação','Alegações Finais por Memoriais','Apelação Criminal','Contrarrazões de Apelação','Recurso em Sentido Estrito','Contrarrazões de RESE','Queixa-Crime','Relaxamento de Prisão','Liberdade Provisória','Revogação de Prisão Preventiva','Habeas Corpus','Revisão Criminal','Embargos Infringentes e de Nulidade','Agravo em Execução','Recurso Ordinário Constitucional'],
  tributario:['Mandado de Segurança','Ação Anulatória de Débito Fiscal','Ação Declaratória de Inexistência de Relação Jurídico-Tributária','Ação de Repetição de Indébito','Ação de Consignação em Pagamento','Embargos à Execução Fiscal','Exceção de Pré-Executividade','Apelação','Agravo de Instrumento','Contrarrazões de Apelação','Recurso Ordinário Constitucional']
};

function client(){ return new OpenAI({ apiKey: openaiKey.value() }); }
function cleanJson(text){
  let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a>=0&&b>a) s=s.slice(a,b+1);
  try{return JSON.parse(s)}catch{throw new HttpsError('internal','A IA devolveu um formato inválido. Tente novamente.');}
}
function boundedText(v,max){ return String(v||'').trim().slice(0,max); }
function requireAuth(request){ if(!request.auth) throw new HttpsError('unauthenticated','Entre com Google para usar este recurso.'); return request.auth.uid; }
function dateKey(){ return new Date().toISOString().slice(0,10); }
async function consume(uid,key,amount,limit){
  const ref=db.doc(`users/${uid}/usage/${dateKey()}`);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref), data=snap.exists?snap.data():{}, used=Number(data?.[key]||0);
    if(used+amount>limit) throw new HttpsError('resource-exhausted','Limite diário deste recurso atingido.');
    tx.set(ref,{[key]:FieldValue.increment(amount),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
}

export const tutorOab = onCall({ region:'southamerica-east1', secrets:[openaiKey] }, async request => {
  requireAuth(request);
  const question=boundedText(request.data?.question,1600), subject=boundedText(request.data?.subject||'Geral',80), context=boundedText(request.data?.context,3500);
  if(question.length<3) throw new HttpsError('invalid-argument','Pergunta vazia.');
  const response=await client().responses.create({model:'gpt-5.6-luna',input:[{role:'system',content:'Você é tutor do Exame da OAB, 1ª e 2ª fases. Responda em português do Brasil, de modo objetivo e tecnicamente rigoroso. Diferencie regra, exceção e pegadinha da FGV. Não invente artigo, súmula ou precedente; quando houver incerteza normativa, diga que a fonte oficial deve ser conferida.'},{role:'user',content:`Matéria/área: ${subject}\nContexto: ${context}\nPergunta: ${question}`}],max_output_tokens:900});
  return {answer:response.output_text||'Não consegui gerar resposta.'};
});

export const generateFirstPhaseBatch = onCall({ region:'southamerica-east1', secrets:[openaiKey], timeoutSeconds:120 }, async request => {
  const uid=requireAuth(request), subject=boundedText(request.data?.subject,40), topic=boundedText(request.data?.topic,120), difficulty=Math.max(1,Math.min(5,Number(request.data?.difficulty||3))), quantity=Math.max(1,Math.min(20,Number(request.data?.quantity||10)));
  if(!SUBJECTS[subject]) throw new HttpsError('invalid-argument','Matéria inválida.');
  await consume(uid,'firstPhaseGenerated',quantity,200);
  const prompt=`Crie ${quantity} questões AUTORAIS para a 1ª fase da OAB/FGV em ${SUBJECTS[subject]}${topic?`, tema ${topic}`:''}. Dificuldade ${difficulty}/5. Não copie nem parafraseie questão oficial ou banco comercial. Use legislação brasileira vigente e estável; evite jurisprudência muito recente ou controvertida. Cada questão deve ter caso concreto plausível, 4 alternativas, exatamente 1 correta, distratores juridicamente verossímeis e explicação objetiva do fundamento. Retorne SOMENTE JSON no formato {"questions":[{"id":"ai-${subject}-...","subject":"${subject}","topic":"...","text":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","difficulty":${difficulty},"sourceType":"autoral-ai","quality":"pending-review"}]}. IDs devem ser únicos.`;
  const draft=await client().responses.create({model:'gpt-5.6-luna',input:[{role:'system',content:'Você cria questões jurídicas para treinamento, com rigor técnico e sem reproduzir conteúdo protegido de terceiros.'},{role:'user',content:prompt}],max_output_tokens:7500});
  let data=cleanJson(draft.output_text), qs=Array.isArray(data.questions)?data.questions:[];
  if(!qs.length) throw new HttpsError('internal','Nenhuma questão foi gerada.');
  const audit=await client().responses.create({model:'gpt-5.6-terra',input:[{role:'system',content:'Você é revisor técnico de questões OAB. Corrija erros jurídicos, ambiguidade, mais de uma alternativa defensável, artigo inventado, enunciado insuficiente e explicação fraca. Não copie questões existentes. Mantenha o JSON e a quantidade. Retorne somente JSON.'},{role:'user',content:JSON.stringify({subject:SUBJECTS[subject],questions:qs}).slice(0,40000)}],max_output_tokens:8000});
  const reviewed=cleanJson(audit.output_text); qs=Array.isArray(reviewed.questions)?reviewed.questions:qs;
  qs=qs.slice(0,quantity).map((q,i)=>({
    id:boundedText(q.id||`ai-${subject}-${Date.now()}-${i}`,90),subject,topic:boundedText(q.topic||topic||'Geral',120),text:boundedText(q.text,3000),options:Array.isArray(q.options)?q.options.slice(0,4).map(x=>boundedText(x,900)):[],correct:Number(q.correct),explanation:boundedText(q.explanation,2200),difficulty,sourceType:'autoral-ai',quality:'ai-reviewed',createdAt:Date.now()
  }));
  return {questions:qs};
});

export const generateSecondPhaseCase = onCall({ region:'southamerica-east1', secrets:[openaiKey], timeoutSeconds:90 }, async request => {
  const uid=requireAuth(request), area=boundedText(request.data?.area,40), kind=boundedText(request.data?.kind||'piece',30);
  if(!AREAS[area]) throw new HttpsError('invalid-argument','Área inválida.');
  await consume(uid,'secondPhaseGenerated',1,40);
  if(kind==='discursives'){
    const r=await client().responses.create({model:'gpt-5.6-terra',input:[{role:'system',content:'Crie questões discursivas autorais no padrão da 2ª fase da OAB. Não copie provas oficiais ou cursos.'},{role:'user',content:`Área: ${AREAS[area]}. Gere 4 questões independentes, cada uma com dois subitens curtos quando útil. Exija resposta fundamentada. Retorne SOMENTE JSON {"discursives":[{"id":"...","question":"...","answerGuide":"...","keyAuthorities":["..."]}]}. Use legislação estável e não invente dispositivos.`}],max_output_tokens:3500});
    const data=cleanJson(r.output_text);return {discursives:Array.isArray(data.discursives)?data.discursives.slice(0,4):[]};
  }
  const allowed=PIECES[area].join(' | ');
  const r=await client().responses.create({model:'gpt-5.6-terra',input:[{role:'system',content:'Você cria casos prático-profissionais autorais para treino da 2ª fase da OAB, com espelho de correção coerente e sem reproduzir provas existentes.'},{role:'user',content:`Área: ${AREAS[area]}. Escolha UMA peça entre: ${allowed}. Crie caso autoral com sinais suficientes para identificar a peça, mas sem dizer o nome no enunciado. O espelho deve somar exatamente 5,00 pontos e avaliar identificação/cabimento, endereçamento, fundamentos, pedidos e fechamento conforme a peça. Retorne SOMENTE JSON {"case":{"id":"ai2-${area}-...","area":"${area}","title":"...","difficulty":4,"facts":"...","piece":"...","cues":["..."],"rubric":[["item",0.5],["item",1.0]]}}.`}],max_output_tokens:4200});
  const data=cleanJson(r.output_text); if(!data.case) throw new HttpsError('internal','Caso inválido.');
  return {case:data.case};
});

export const gradeSecondPhase = onCall({ region:'southamerica-east1', secrets:[openaiKey], timeoutSeconds:120 }, async request => {
  const uid=requireAuth(request), area=boundedText(request.data?.area,40), answer=boundedText(request.data?.answer,18000), caseData=request.data?.caseData||{};
  if(!AREAS[area]) throw new HttpsError('invalid-argument','Área inválida.');
  if(answer.length<300) throw new HttpsError('invalid-argument','Resposta muito curta para correção.');
  await consume(uid,'secondPhaseGrades',1,60);
  const safeCase={title:boundedText(caseData.title,200),facts:boundedText(caseData.facts,6000),piece:boundedText(caseData.piece,160),rubric:Array.isArray(caseData.rubric)?caseData.rubric.slice(0,30):[]};
  const r=await client().responses.create({model:'gpt-5.6-terra',input:[{role:'system',content:'Você corrige treino da 2ª fase da OAB com severidade semelhante a espelho FGV. Não atribua ponto por mera citação sem desenvolvimento quando o item exige fundamentação. Não invente exigências fora do espelho fornecido. Retorne somente JSON.'},{role:'user',content:`Área: ${AREAS[area]}\nCASO E ESPELHO: ${JSON.stringify(safeCase)}\nRESPOSTA DO ALUNO:\n${answer}\n\nAvalie item por item respeitando os máximos do espelho. Identifique se a peça foi correta. Retorne {"score":0.0,"pieceIdentification":"...","summary":"...","priorityFix":"...","items":[{"item":"...","score":0.0,"max":0.0,"feedback":"..."}]}. Nota total entre 0 e 5.`}],max_output_tokens:4200});
  const data=cleanJson(r.output_text);data.score=Math.max(0,Math.min(5,Number(data.score||0)));return data;
});
