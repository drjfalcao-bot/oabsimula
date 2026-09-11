import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { topicPlan } from './oab-blueprint.js';

if(!getApps().length) initializeApp();
const db=getFirestore();

function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function tokens(value){return new Set(normalize(value).split(' ').filter(x=>x.length>2))}
function overlap(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/(A.size+B.size-hit)}
function nearest(raw,plan){let best=null,score=0;for(const p of plan){const s=overlap(raw,p.topic);if(s>score){score=s;best=p}}return score>=.28?best:null}

export const getOabCoveragePlan=onCall({region:'southamerica-east1'},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Entre com Google para analisar o banco.');
  const subject=String(request.data?.subject||'').trim();
  const plan=topicPlan(subject);
  if(!plan.length)return {subject,total:0,covered:0,plan:[],suggested:null,note:'Esta matéria ainda não possui matriz histórica fina no motor.'};
  const snap=await db.collection('question_bank').where('status','==','published').where('subject','==',subject).limit(3000).get();
  const counts=Object.fromEntries(plan.map(p=>[p.topic,0]));
  let unmapped=0;
  for(const doc of snap.docs){const q=doc.data(),m=nearest(q.topic,plan);if(m)counts[m.topic]++;else unmapped++;}
  const totalMapped=Object.values(counts).reduce((a,b)=>a+b,0);
  const targetBase=Math.max(120,totalMapped);
  const rows=plan.map(p=>{
    const actual=counts[p.topic]||0;
    const desired=Math.max(5,Math.round(targetBase*p.share));
    const gap=Math.max(0,desired-actual);
    const coverage=desired?Math.min(1,actual/desired):1;
    return {...p,actual,desired,gap,coverage};
  }).sort((a,b)=>b.gap-a.gap||b.share-a.share);
  return {subject,total:snap.size,mapped:totalMapped,unmapped,coverage:rows.length?rows.reduce((n,x)=>n+x.coverage*x.share,0):0,plan:rows,suggested:rows.find(x=>x.gap>0)||rows[0]||null,method:'alvo mínimo de 120 questões por disciplina núcleo, distribuídas proporcionalmente à incidência histórica OAB 32–47'};
});
