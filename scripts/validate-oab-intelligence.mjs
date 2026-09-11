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
if(I.EXAM.examDate!=='2027-01-10')throw new Error(`Data da 1ª fase divergente: ${I.EXAM.examDate}`);
if(I.EXAM.editalExpected!=='2026-09-21')throw new Error(`Data esperada do edital divergente: ${I.EXAM.editalExpected}`);

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
