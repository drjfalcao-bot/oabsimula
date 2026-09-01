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

function shuffled(arr){
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function balancedAnswerTargets(n){
  const targets=[];
  for(let i=0;i<n;i++)targets.push(i%4);
  let out=shuffled(targets);
  for(let pass=0;pass<12;pass++){
    let changed=false;
    for(let i=2;i<out.length;i++){
      if(out[i]===out[i-1]&&out[i]===out[i-2]){
        const j=out.findIndex((v,k)=>k>i&&v!==out[i]);
        if(j>i){[out[i],out[j]]=[out[j],out[i]];changed=true;}
      }
    }
    if(!changed)break;
  }
  return out;
}
function rebalanceAnswers(qs){
  const targets=balancedAnswerTargets(qs.length);
  return qs.map((q,i)=>{
    if(!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(Number(q.correct))||Number(q.correct)<0||Number(q.correct)>3)return q;
    const correctText=q.options[Number(q.correct)];
    const distractors=shuffled(q.options.filter((_,idx)=>idx!==Number(q.correct)));
    const options=[];let d=0;
    for(let p=0;p<4;p++)options[p]=p===targets[i]?correctText:distractors[d++];
    return {...q,options,correct:targets[i]};
  });
}
function questionIssues(q){
  const issues=[];
  const text=String(q?.text||'').trim(), options=Array.isArray(q?.options)?q.options.map(x=>String(x||'').trim()):[];
  const correct=Number(q?.correct);
  if(text.length<120)issues.push('enunciado_curto');
  if(options.length!==4||options.some(x=>x.length<12))issues.push('alternativas_invalidas');
  if(!Number.isInteger(correct)||correct<0||correct>3)issues.push('gabarito_invalido');
  if(options.length===4&&Number.isInteger(correct)&&correct>=0&&correct<4){
    const lens=options.map(x=>x.replace(/\s+/g,' ').length), corr=lens[correct];
    const others=lens.filter((_,i)=>i!==correct), maxOther=Math.max(...others), minOther=Math.min(...others);
    const avg=lens.reduce((a,b)=>a+b,0)/4;
    if(corr>maxOther*1.28&&corr>avg*1.22)issues.push('correta_outlier_comprimento');
    if(Math.max(...lens)>Math.max(70,Math.min(...lens)*2.35)&&minOther<35)issues.push('alternativas_desequilibradas');
    const normalized=options.map(x=>x.toLowerCase().replace(/\W+/g,' ').trim());
    if(new Set(normalized).size<4)issues.push('alternativas_duplicadas');
  }
  return issues;
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

  const difficultyGuide={
    1:'regra central e aplicação direta, sem pegadinha artificial',
    2:'caso simples com uma distinção jurídica relevante',
    3:'padrão médio real da FGV: caso concreto, regra + exceção ou requisito específico, distratores próximos',
    4:'padrão médio-alto da FGV: duas etapas de raciocínio, detalhe fático juridicamente decisivo e distratores tecnicamente plausíveis',
    5:'padrão difícil da FGV: caso denso porém objetivo, exceção/competência/prazo/efeito jurídico ou conflito de institutos; exige discriminação fina sem depender de jurisprudência obscura'
  }[difficulty];

  const prompt=`Crie ${quantity} questões AUTORAIS para a 1ª fase da OAB/FGV em ${SUBJECTS[subject]}${topic?`, tema ${topic}`:''}. Nível ${difficulty}/5: ${difficultyGuide}.

CALIBRAÇÃO DE ESTILO: reproduza a ESTRUTURA cognitiva típica da FGV sem copiar nem parafrasear prova oficial: enunciado predominantemente casuístico, fatos suficientes para aplicar a norma, comando claro e quatro alternativas juridicamente verossímeis. A dificuldade deve vir da distinção jurídica correta, não de redação obscura.

REGRAS OBRIGATÓRIAS:
1. Use legislação brasileira vigente e estável; evite tese controvertida ou atualização muito recente.
2. Exatamente uma alternativa correta. As três erradas devem parecer plausíveis para quem conhece parcialmente a matéria e errar por um detalhe jurídico preciso.
3. Não use pistas formais. A correta NÃO pode ser sistematicamente a mais longa, mais detalhada, mais técnica ou a única com ressalvas. Mantenha comprimentos comparáveis; idealmente a maior alternativa não deve superar a menor em mais de ~60%, salvo necessidade semântica real.
4. Distribua a posição do gabarito entre 0,1,2,3 de forma equilibrada no lote. Diferença máxima de 1 entre as frequências e nunca mais de duas corretas consecutivas na mesma posição.
5. Evite alternativas absurdas, absolutismos fáceis ('sempre', 'nunca') quando funcionarem apenas como pista, e pares em que três respostas sejam obviamente descartáveis sem conhecimento jurídico.
6. Para dificuldade 3–5, prefira personagens e contexto concreto. O enunciado deve normalmente ter 120–650 caracteres e exigir aplicação, não mera definição decorada.
7. A explicação deve dizer por que a correta é correta e qual detalhe invalida os principais distratores. Não invente artigo, súmula ou precedente.
8. Não copie nem parafraseie questão oficial, curso ou banco comercial.

Retorne SOMENTE JSON no formato {"questions":[{"id":"ai-${subject}-...","subject":"${subject}","topic":"...","text":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","difficulty":${difficulty},"sourceType":"autoral-ai","quality":"pending-review"}]}. IDs únicos.`;

  const draft=await client().responses.create({
    model:'gpt-5.6-luna',
    input:[
      {role:'system',content:'Você cria questões jurídicas autorais para treinamento OAB com rigor técnico. O objetivo é equivalência de dificuldade e arquitetura cognitiva, nunca reprodução textual de prova existente. Não crie pistas estatísticas no gabarito.'},
      {role:'user',content:prompt}
    ],
    max_output_tokens:9000
  });

  let data=cleanJson(draft.output_text), qs=Array.isArray(data.questions)?data.questions:[];
  if(!qs.length) throw new HttpsError('internal','Nenhuma questão foi gerada.');

  const auditPrompt=`Revise o lote abaixo como editor técnico de prova OAB/FGV. Corrija conteúdo e REDAÇÃO mantendo a quantidade e o formato JSON.

Audite obrigatoriamente cada item por estes critérios:
- exatamente uma resposta defensável;
- caso concreto suficiente e compatível com dificuldade ${difficulty}/5;
- distratores próximos, falsos por detalhe jurídico identificável;
- nenhuma resposta correta denunciada por ser a mais longa, a única detalhada, a única com fundamento ou a única com ressalva;
- comprimentos das quatro alternativas visualmente comparáveis;
- distribuição do campo correct equilibrada entre 0,1,2,3 no lote, diferença máxima 1 e sem sequência de 3 iguais;
- nenhuma citação legal inventada ou tese controversa tratada como pacífica;
- explicação causal: regra aplicável + erro central dos distratores.

Se uma questão estiver fácil demais para o nível solicitado, aumente a discriminação jurídica pelo caso ou pelos distratores, sem obscurecer a linguagem. Não copie questões existentes. Retorne SOMENTE JSON com {"questions":[...]}.`;

  const audit=await client().responses.create({
    model:'gpt-5.6-terra',
    input:[
      {role:'system',content:'Você é revisor técnico de questões da 1ª fase da OAB. Seu trabalho é remover ambiguidade, erro jurídico e pistas estatísticas, com severidade editorial semelhante a uma banca profissional. Não reproduza conteúdo protegido.'},
      {role:'user',content:`${auditPrompt}\n\nLOTE:\n${JSON.stringify({subject:SUBJECTS[subject],questions:qs}).slice(0,50000)}`}
    ],
    max_output_tokens:10000
  });

  const reviewed=cleanJson(audit.output_text); qs=Array.isArray(reviewed.questions)?reviewed.questions:qs;
  qs=qs.slice(0,quantity).map((q,i)=>({
    id:boundedText(q.id||`ai-${subject}-${Date.now()}-${i}`,90),
    subject,
    topic:boundedText(q.topic||topic||'Geral',120),
    text:boundedText(q.text,3000),
    options:Array.isArray(q.options)?q.options.slice(0,4).map(x=>boundedText(x,900)):[],
    correct:Number(q.correct),
    explanation:boundedText(q.explanation,2200),
    difficulty,
    sourceType:'autoral-ai',
    quality:'ai-reviewed-v2',
    engineVersion:2,
    createdAt:Date.now()
  }));

  const structural=qs.flatMap((q,i)=>questionIssues(q).map(issue=>`q${i+1}:${issue}`));
  if(structural.length){
    const repair=await client().responses.create({
      model:'gpt-5.6-terra',
      input:[
        {role:'system',content:'Repare exclusivamente problemas de qualidade em um lote de questões OAB. Preserve matéria e sentido jurídico, mas elimine pistas formais, enunciados curtos demais, alternativas desproporcionais, duplicidade e ambiguidade. Retorne somente JSON.'},
        {role:'user',content:`Problemas detectados: ${structural.join(', ')}\nLote: ${JSON.stringify({questions:qs}).slice(0,50000)}`}
      ],
      max_output_tokens:10000
    });
    const repaired=cleanJson(repair.output_text);
    if(Array.isArray(repaired.questions)){
      qs=repaired.questions.slice(0,quantity).map((q,i)=>({
        id:boundedText(q.id||qs[i]?.id||`ai-${subject}-${Date.now()}-${i}`,90),subject,topic:boundedText(q.topic||qs[i]?.topic||topic||'Geral',120),text:boundedText(q.text,3000),options:Array.isArray(q.options)?q.options.slice(0,4).map(x=>boundedText(x,900)):[],correct:Number(q.correct),explanation:boundedText(q.explanation,2200),difficulty,sourceType:'autoral-ai',quality:'ai-reviewed-v2',engineVersion:2,createdAt:Date.now()
      }));
    }
  }

  qs=rebalanceAnswers(qs);
  const remaining=qs.flatMap((q,i)=>questionIssues(q).map(issue=>`q${i+1}:${issue}`));
  if(remaining.some(x=>x.includes('gabarito_invalido')||x.includes('alternativas_invalidas'))){
    throw new HttpsError('internal','O lote não passou na validação estrutural. Gere novamente.');
  }

  return {questions:qs,quality:{engineVersion:2,issues:remaining}};
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

export const gradeSecondPhaseDiscursives = onCall({ region:'southamerica-east1', secrets:[openaiKey], timeoutSeconds:120 }, async request => {
  const uid=requireAuth(request), area=boundedText(request.data?.area,40);
  if(!AREAS[area]) throw new HttpsError('invalid-argument','Área inválida.');
  const questions=Array.isArray(request.data?.questions)?request.data.questions.slice(0,4):[];
  const answers=Array.isArray(request.data?.answers)?request.data.answers.slice(0,4):[];
  if(questions.length!==4 || answers.length!==4) throw new HttpsError('invalid-argument','Envie as quatro questões e respostas.');
  if(answers.some(a=>boundedText(a,6000).length<40)) throw new HttpsError('invalid-argument','Responda as quatro discursivas antes da correção.');
  await consume(uid,'secondPhaseDiscursiveGrades',1,60);
  const safe=questions.map((q,i)=>({question:boundedText(q?.question||q,2500),answerGuide:boundedText(q?.answerGuide,3000),keyAuthorities:Array.isArray(q?.keyAuthorities)?q.keyAuthorities.slice(0,12).map(x=>boundedText(x,150)):[],answer:boundedText(answers[i],6000)}));
  const r=await client().responses.create({model:'gpt-5.6-terra',input:[{role:'system',content:'Você corrige quatro questões discursivas da 2ª fase da OAB. Cada questão vale 1,25. Seja estrito: pontue conclusão juridicamente correta, fundamento desenvolvido e dispositivo/súmula quando realmente aplicável. Não invente fundamento ausente do guia. Retorne somente JSON.'},{role:'user',content:`Área: ${AREAS[area]}\nITENS: ${JSON.stringify(safe)}\nRetorne {"score":0.0,"items":[{"number":1,"score":0.0,"max":1.25,"feedback":"...","missing":["..."]}],"summary":"...","priorityFix":"..."}. A soma deve estar entre 0 e 5.`}],max_output_tokens:4200});
  const data=cleanJson(r.output_text); data.score=Math.max(0,Math.min(5,Number(data.score||0))); return data;
});
