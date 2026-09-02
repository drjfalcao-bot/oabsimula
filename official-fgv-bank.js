// Banco oficial FGV/OAB — 42º ao 46º Exame de Ordem Unificado, prova Tipo 1.
//
// Estratégia de ingestão:
// - texto e alternativas são carregados de uma extração pública estruturada, fixada por commit;
// - o gabarito NÃO é aceito dessa extração: é sobrescrito pelos gabaritos definitivos oficiais da FGV;
// - questões anuladas no gabarito definitivo são marcadas com annulled:true e valem acerto para qualquer alternativa;
// - a ordem original das alternativas é preservada.
//
// A fonte jurídica/editorial exibida ao aluno é sempre a FGV/OAB.

const EXTRACTION_COMMIT = 'fa50e6f7ef31d0e03cca68e7ad5dfc1874bcf7eb';
const EXTRACTION_BASE = `https://raw.githubusercontent.com/lucaspresende-ai/oab-simulador/${EXTRACTION_COMMIT}/dados_brutos`;
const CACHE_VERSION = 'v1';

const SUBJECT_RANGES = [
  [1,8,'etica'],
  [9,10,'filosofia'],
  [11,16,'constitucional'],
  [17,18,'humanos'],
  [19,20,'eleitoral'],
  [21,22,'internacional'],
  [23,24,'financeiro'],
  [25,29,'tributario'],
  [30,34,'administrativo'],
  [35,36,'ambiental'],
  [37,42,'civil'],
  [43,44,'eca'],
  [45,46,'consumidor'],
  [47,50,'empresarial'],
  [51,56,'processo-civil'],
  [57,62,'penal'],
  [63,68,'processo-penal'],
  [69,70,'previdenciario'],
  [71,75,'trabalho'],
  [76,80,'processo-trabalho']
];

const SUBJECT_LABELS = {
  etica:'Ética Profissional',filosofia:'Filosofia do Direito',constitucional:'Direito Constitucional',humanos:'Direitos Humanos',eleitoral:'Direito Eleitoral',internacional:'Direito Internacional',financeiro:'Direito Financeiro',tributario:'Direito Tributário',administrativo:'Direito Administrativo',ambiental:'Direito Ambiental',civil:'Direito Civil',eca:'ECA',consumidor:'Direito do Consumidor',empresarial:'Direito Empresarial','processo-civil':'Processo Civil',penal:'Direito Penal','processo-penal':'Processo Penal',previdenciario:'Direito Previdenciário',trabalho:'Direito do Trabalho','processo-trabalho':'Processo do Trabalho'
};

export const OFFICIAL_FGV_EXAMS = Object.freeze({
  42: {
    year: 2024,
    examDate: '2024-12-01',
    key: 'D B D A D B C A D A B A D A D D A B B D B D C B C C A A C B C A A D C A D B C B D C * C C B C A A D B C D B C B C A C C A C B A B A D C A B C C D B C A D A D B'.split(' '),
    questionPdf: 'https://oab.fgv.br/arq/645/402439_OAB%2042%20-%20ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    keyPdf: 'https://oab.fgv.br/arq/645/273585_OAB42%20Gabaritos%20para%20publica%C3%A7%C3%A3o%20-%20V20241203%20(003).pdf'
  },
  43: {
    year: 2025,
    examDate: '2025-04-27',
    key: '* C A A C B D C B D D B B A B C C A D D C C D B C B A B A D C A A C D B B A B A C B B D A D A B D A C D C A B B C D C A D C D B A D A B B D C B A * D C C A D A'.split(' '),
    questionPdf: 'https://oab.fgv.br/arq/646/838452_ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    keyPdf: 'https://oab.fgv.br/arq/646/194143_oab251_gabarito_definitivo_ms.pdf'
  },
  44: {
    year: 2025,
    examDate: '2025-08-17',
    key: 'C B B A C B C C A D C D C D D B D A D C D A B C C C D B A D A A D C B A D C C A D B A A B A C B B A C D A A B D D D B C D C B D C B A B A A D C B A C A D B B A'.split(' '),
    questionPdf: 'https://oab.fgv.br/arq/647/519680_ADVOGADO%20OAB(CNS01)%20Tipo%201%20(2).pdf',
    keyPdf: 'https://oab.fgv.br/arq/647/158882_OAB44%20Gabaritos%20para%20publica%C3%A7%C3%A3o%20-%20definitivo.pdf'
  },
  45: {
    year: 2025,
    examDate: '2025-12-21',
    key: 'A A C C B A D B B C C D B A D A B A C A D C A D B C B B D B D A A D D C C D A A B D D C B D B C A C B C D A B D D C D C A B C A B C B D A D A D D B D C B B A A'.split(' '),
    questionPdf: 'https://oab.fgv.br/arq/648/405589_ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    keyPdf: 'https://oab.fgv.br/arq/648/85707_OAB45%20Gabaritos%20para%20publica%C3%A7%C3%A3o%20-%20v3.pdf'
  },
  46: {
    year: 2026,
    examDate: '2026-05-03',
    key: 'C D C A D A C D B C C B B D C D B D A A D C A C B D B C D D A B B A C A A D B B A B D C B D A B C C B C C C A B B D A A B C D B D B A B B A D D A A C C D A D B'.split(' '),
    questionPdf: 'https://oab.fgv.br/arq/649/561671_ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    keyPdf: 'https://oab.fgv.br/arq/649/103500_oab261_gabarito_definitivo.pdf'
  }
});

export const OFFICIAL_FGV_EXAM_COUNT = Object.keys(OFFICIAL_FGV_EXAMS).length;
export const OFFICIAL_FGV_QUESTION_TARGET = OFFICIAL_FGV_EXAM_COUNT * 80;

let memoryCache = null;
let inflight = null;

function subjectFor(number){
  const row=SUBJECT_RANGES.find(([a,b])=>number>=a&&number<=b);
  return row?.[2]||'etica';
}

function cleanOption(value){
  return String(value||'').trim().replace(/^[A-D]\s*[\)\.\-:]\s*/i,'').trim();
}

function letterIndex(letter){
  return {A:0,B:1,C:2,D:3}[letter] ?? 0;
}

function cacheKey(exam){ return `oab-aprova-official-fgv-${exam}-${CACHE_VERSION}-${EXTRACTION_COMMIT.slice(0,8)}`; }

function readCached(exam){
  try{
    if(typeof localStorage==='undefined')return null;
    const raw=localStorage.getItem(cacheKey(exam));
    const data=raw?JSON.parse(raw):null;
    return Array.isArray(data)&&data.length===80?data:null;
  }catch{return null;}
}

function writeCached(exam,data){
  try{
    if(typeof localStorage!=='undefined')localStorage.setItem(cacheKey(exam),JSON.stringify(data));
  }catch{/* cache best-effort */}
}

async function fetchExam(exam){
  const cached=readCached(exam);
  if(cached)return cached;
  const url=`${EXTRACTION_BASE}/questoes${exam}.json`;
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error(`FGV ${exam}: falha na camada de extração (${response.status}).`);
  const data=await response.json();
  if(!Array.isArray(data)||data.length!==80)throw new Error(`FGV ${exam}: esperado 80 questões, recebido ${Array.isArray(data)?data.length:'formato inválido'}.`);
  writeCached(exam,data);
  return data;
}

function normalizeExam(exam,rows){
  const meta=OFFICIAL_FGV_EXAMS[exam];
  if(!meta||meta.key.length!==80)throw new Error(`FGV ${exam}: gabarito oficial inválido.`);
  const byNumber=new Map(rows.map(row=>[Number(row.id),row]));
  const result=[];
  for(let number=1;number<=80;number++){
    const raw=byNumber.get(number);
    if(!raw)throw new Error(`FGV ${exam}: questão ${number} ausente na extração.`);
    const text=String(raw.texto_pergunta||raw.text||raw.enunciado||'').trim();
    const options=(raw.alternativas||raw.options||[]).slice(0,4).map(cleanOption);
    if(text.length<20||options.length!==4||options.some(x=>!x))throw new Error(`FGV ${exam}: questão ${number} estruturalmente inválida.`);
    const officialKey=meta.key[number-1];
    const annulled=officialKey==='*';
    const extractedKey=String(raw.resposta_correta||raw.correct||'').trim().toUpperCase();
    const subject=subjectFor(number);
    result.push({
      id:`fgv-oab${exam}-t1-q${String(number).padStart(2,'0')}`,
      subject,
      topic:`${SUBJECT_LABELS[subject]} • prova oficial`,
      text,
      options,
      correct:annulled?0:letterIndex(officialKey),
      explanation:annulled
        ? 'Questão anulada no gabarito definitivo da FGV/OAB. Para fins de treino, qualquer alternativa é considerada correta.'
        : `Gabarito definitivo oficial da FGV/OAB: alternativa ${officialKey}. Questão oficial preservada sem comentário editorial automático.`,
      official:true,
      origin:'official-fgv',
      sourceType:'fgv-official',
      storage:'official',
      preserveOfficialOrder:true,
      exam:String(exam),
      examNumber:Number(exam),
      examType:'1',
      year:meta.year,
      examDate:meta.examDate,
      questionNumber:number,
      officialAnswerKey:annulled?null:officialKey,
      annulled,
      extractedAnswerKey:extractedKey||null,
      extractionKeyMatchesOfficial:annulled?null:extractedKey===officialKey,
      difficulty:'oficial-fgv',
      quality:'oficial-gabarito-definitivo',
      sources:[
        {title:`FGV/OAB — ${exam}º EOU — Caderno Tipo 1`,url:meta.questionPdf,kind:'prova oficial'},
        {title:`FGV/OAB — ${exam}º EOU — Gabarito definitivo`,url:meta.keyPdf,kind:'gabarito oficial'}
      ],
      source:`FGV/OAB — ${exam}º Exame — Tipo 1`,
      ingestion:{
        extractor:'dataset público estruturado; gabarito sobrescrito pela FGV',
        pinnedCommit:EXTRACTION_COMMIT,
        url:`${EXTRACTION_BASE}/questoes${exam}.json`
      }
    });
  }
  return result;
}

export function validateOfficialFgvConfig(){
  const issues=[];
  for(const [exam,meta] of Object.entries(OFFICIAL_FGV_EXAMS)){
    if(meta.key.length!==80)issues.push(`${exam}: gabarito tem ${meta.key.length} itens`);
    meta.key.forEach((v,i)=>{if(!['A','B','C','D','*'].includes(v))issues.push(`${exam}/Q${i+1}: valor de gabarito inválido ${v}`);});
    if(!String(meta.questionPdf).startsWith('https://oab.fgv.br/'))issues.push(`${exam}: URL de prova não oficial`);
    if(!String(meta.keyPdf).startsWith('https://oab.fgv.br/'))issues.push(`${exam}: URL de gabarito não oficial`);
  }
  return issues;
}

export async function getOfficialFgvQuestions({force=false}={}){
  if(memoryCache&&!force)return memoryCache.map(q=>({...q,options:[...q.options],sources:q.sources.map(s=>({...s}))}));
  if(inflight&&!force)return inflight;
  inflight=(async()=>{
    const configIssues=validateOfficialFgvConfig();
    if(configIssues.length)throw new Error(`Banco FGV oficial com configuração inválida: ${configIssues.join('; ')}`);
    const exams=Object.keys(OFFICIAL_FGV_EXAMS).map(Number).sort((a,b)=>a-b);
    const parts=await Promise.all(exams.map(async exam=>normalizeExam(exam,await fetchExam(exam))));
    const all=parts.flat();
    if(all.length!==OFFICIAL_FGV_QUESTION_TARGET)throw new Error(`Banco FGV: esperado ${OFFICIAL_FGV_QUESTION_TARGET}, recebido ${all.length}.`);
    const ids=new Set(all.map(q=>q.id));
    if(ids.size!==all.length)throw new Error('Banco FGV: IDs duplicados.');
    memoryCache=all;
    return all;
  })();
  try{return await inflight;}finally{inflight=null;}
}

export function clearOfficialFgvCache(){
  memoryCache=null;
  try{
    if(typeof localStorage!=='undefined')for(const exam of Object.keys(OFFICIAL_FGV_EXAMS))localStorage.removeItem(cacheKey(exam));
  }catch{/* noop */}
}
