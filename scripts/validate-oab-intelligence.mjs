import fs from 'node:fs';
import vm from 'node:vm';
import { OAB_TOPIC_BLUEPRINT, OAB_SUBJECT_WEIGHTS, topicPlan, initialCoverageTarget } from '../functions/oab-blueprint.js';

function evaluateClientFile(path, window){
  const code=fs.readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
  const context=vm.createContext({window,console,Date,Math,Set,Map,Object,Array,String,Number,JSON,URL});
  vm.runInContext(code,context,{filename:path});
}

const window={};
evaluateClientFile('learning-materials.js',window);
evaluateClientFile('oab-intelligence.js',window);
const I=window.OAB_INTELLIGENCE;
const M=window.OAB_LEARNING_MATERIALS;
if(!I)throw new Error('OAB_INTELLIGENCE não foi inicializado.');
if(!M)throw new Error('OAB_LEARNING_MATERIALS não foi inicializado.');

const total=Object.values(I.SUBJECTS).reduce((n,s)=>n+s.q,0);
const core=Object.values(I.SUBJECTS).filter(s=>s.core).reduce((n,s)=>n+s.q,0);
if(total!==80)throw new Error(`Distribuição da prova inválida: ${total}/80.`);
if(core!==62)throw new Error(`Núcleo estratégico inválido: ${core}/62.`);
if(I.EXAM.examDate!==null || I.EXAM.target!==null)throw new Error('Preparação deve começar sem edição/data fixa.');
if(I.EXAM.status!=='continuous-preparation')throw new Error('A estratégia deve ser permanente.');
const examSource=fs.readFileSync(new URL('../historical-exams.js',import.meta.url),'utf8');
const keyMatch=examSource.match(/key:'([^']+)'/);
const key47=keyMatch?.[1]?.split(' ');
if(key47?.length!==80 || key47[46]!=='*' || key47.filter(x=>x==='*').length!==1 ||
 key47.some(x=>!['A','B','C','D','*'].includes(x)))throw new Error('Gabarito oficial do 47º EOU inconsistente.');
const examPage=fs.readFileSync(new URL('../provas.html',import.meta.url),'utf8');
const mainPage=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
if(!mainPage.includes('href="provas.html"') || !examPage.includes('provas.js'))
 throw new Error('Navegação para provas históricas ausente.');
if(/48º Exame|2027-01-10/.test(mainPage))throw new Error('Página principal não pode depender de edição fixa.');


const coreSubjects=Object.entries(I.SUBJECTS).filter(([,s])=>s.core).map(([id])=>id);
for(const id of coreSubjects){
  if(!I.TOPICS[id]?.length)throw new Error(`${id}: sem matriz temática histórica.`);
  const rows=I.topicObjects(id);
  const share=rows.reduce((n,x)=>n+x.historicalShare,0);
  if(Math.abs(share-1)>1e-9)throw new Error(`${id}: participações históricas somam ${share}.`);
  if(rows.some(x=>!Number.isFinite(x.historicalCount)||x.historicalCount<=0))throw new Error(`${id}: contagem histórica inválida.`);
  const server=topicPlan(id);
  if(!server.length)throw new Error(`${id}: ausente do blueprint server-side.`);
  const clientCount=rows.reduce((n,x)=>n+x.historicalCount,0);
  const serverCount=server.reduce((n,x)=>n+x.count,0);
  if(clientCount!==serverCount)throw new Error(`${id}: client=${clientCount}, server=${serverCount} nas contagens históricas.`);
  if(OAB_SUBJECT_WEIGHTS[id]!==I.SUBJECTS[id].q)throw new Error(`${id}: peso server/client divergente.`);
  const target=initialCoverageTarget(id,20);
  if(target!==I.SUBJECTS[id].q*20)throw new Error(`${id}: alvo de cobertura inválido: ${target}.`);
  const materialKey=id.replaceAll('-','_');
  if(!M.topicCatalog?.[materialKey])throw new Error(`${id}: sem catálogo pedagógico do acervo.`);
}

const learningSource=fs.readFileSync(new URL('../learning-materials.js',import.meta.url),'utf8');
const forbidden=['drive.google.com','docs.google.com','/file/d/','/folders/'];
for(const token of forbidden)if(learningSource.includes(token))throw new Error(`learning-materials.js expõe referência privada proibida: ${token}`);

const topicIds=new Set();
for(const [subject,rows] of Object.entries(I.TOPICS)){
  for(const row of rows){
    const key=`${subject}|${row[0]}`;
    if(topicIds.has(key))throw new Error(`Tópico duplicado: ${key}`);
    topicIds.add(key);
  }
}

if(Object.keys(OAB_TOPIC_BLUEPRINT).length!==coreSubjects.length)throw new Error(`Blueprint server cobre ${Object.keys(OAB_TOPIC_BLUEPRINT).length} matérias; esperado ${coreSubjects.length}.`);
console.log(`Inteligência OAB íntegra: ${total} questões, Núcleo ${core}, ${coreSubjects.length} matérias núcleo, ${topicIds.size} grupos temáticos, acervo privado sem URLs expostas.`);
