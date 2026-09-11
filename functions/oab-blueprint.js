export const OAB_SUBJECT_WEIGHTS = Object.freeze({
  etica:8,constitucional:6,civil:6,'processo-civil':6,penal:6,'processo-penal':6,
  trabalho:5,'processo-trabalho':5,administrativo:5,tributario:5,empresarial:4
});

export const OAB_TOPIC_BLUEPRINT = {
  etica:[['Prerrogativas',19],['Infrações, sanções e processo disciplinar',19],['Inscrição e exercício profissional',16],['Sociedade de advogados',15],['Honorários advocatícios',14],['Mandato e procuração',10],['Incompatibilidades e impedimentos',10],['Publicidade profissional',10],['Deveres e responsabilidade profissional',9],['Organização da OAB',7]],
  constitucional:[['Organização do Estado e federalismo',21],['Controle de constitucionalidade',19],['Poderes e processo legislativo',16],['Direitos fundamentais',14],['Ordem social e econômica',13],['Judiciário e funções essenciais',10],['Remédios constitucionais',7],['Nacionalidade e direitos políticos',6]],
  civil:[['Parte geral, pessoas e negócio jurídico',19],['Contratos',18],['Família',17],['Direitos reais',14],['Sucessões',13],['Responsabilidade civil',12],['Obrigações',10]],
  'processo-civil':[['Cumprimento de sentença e execução',24],['Procedimento comum, provas e postulação',17],['Recursos',16],['Procedimentos especiais',14],['Litisconsórcio e intervenção de terceiros',8],['Sujeitos, competência e atos processuais',7],['Tutela provisória',6],['Arbitragem e solução consensual',6],['Juizados Especiais Cíveis',3]],
  tributario:[['Competência e limitações ao poder de tributar',15],['Obrigação e responsabilidade tributária',14],['Espécies tributárias',13],['Administração e processo tributário',13],['Crédito tributário',11],['Tributos em espécie',8],['Imunidades',6]],
  administrativo:[['Licitações e contratos administrativos',16],['Intervenção do Estado na propriedade',13],['Organização administrativa e serviços públicos',12],['Agentes públicos',12],['Improbidade administrativa',10],['Atos administrativos',8],['Processo administrativo e bens públicos',7],['Lei Anticorrupção',4],['Controle da Administração',4],['Responsabilidade civil do Estado',3]],
  penal:[['Teoria do crime',20],['Iter criminis, concurso de pessoas e de crimes',15],['Penas e medidas de segurança',15],['Crimes contra a pessoa, honra e dignidade sexual',12],['Aplicação da lei penal',11],['Leis penais especiais',9],['Crimes contra o patrimônio',7],['Crimes contra a Administração Pública',5]],
  'processo-penal':[['Investigação e ação penal',22],['Prisões e medidas cautelares',15],['Provas',14],['Recursos e habeas corpus',10],['Execução penal',10],['Competência',9],['Atos processuais e nulidades',9],['Tribunal do Júri',8]],
  trabalho:[['Relação de emprego e contrato de trabalho',18],['Jornada, férias e descansos',18],['Alteração, suspensão e interrupção contratual',14],['Extinção contratual e estabilidades',14],['Remuneração e salário',13],['Saúde e segurança do trabalhador',6],['Direito coletivo do trabalho',3]],
  'processo-trabalho':[['Recursos trabalhistas',21],['Procedimento, audiência e nulidades',18],['Execução e liquidação',17],['Ações e procedimentos especiais',10],['Provas',5],['Custas, honorários e justiça gratuita',5],['Competência da Justiça do Trabalho',4]],
  empresarial:[['Sociedades',18],['Recuperação judicial e falência',15],['Empresário e registro',10],['Estabelecimento e nome empresarial',8],['Títulos de crédito',8],['Contratos empresariais',6],['Propriedade intelectual',4]]
};

export function topicPlan(subject){
  const rows=OAB_TOPIC_BLUEPRINT[subject]||[];
  const total=rows.reduce((n,x)=>n+x[1],0)||1;
  return rows.map(([topic,count])=>({topic,count,share:count/total}));
}

export function initialCoverageTarget(subject,examEquivalents=20){
  return (OAB_SUBJECT_WEIGHTS[subject]||0)*examEquivalents;
}

export function chooseCoverageTopic(subject,counts={}){
  const rows=topicPlan(subject);
  if(!rows.length)return null;
  const totalBank=Object.values(counts).reduce((n,v)=>n+Number(v||0),0);
  const targetBase=initialCoverageTarget(subject,20)||Math.max(60,totalBank);
  const initial=rows.map(x=>{
    const actual=Number(counts[x.topic]||0);
    const desired=Math.max(3,Math.round(targetBase*x.share));
    return {...x,actual,desired,gap:Math.max(0,desired-actual)};
  });
  const withGap=initial.filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap||b.share-a.share);
  if(withGap.length)return withGap[0];
  // Depois de completar 20 provas equivalentes, continua crescendo sem distorcer a matriz.
  return initial.map(x=>{
    const expectedNow=Math.max(1,totalBank*x.share);
    return {...x,representation:x.actual/expectedNow};
  }).sort((a,b)=>a.representation-b.representation||b.share-a.share)[0];
}
