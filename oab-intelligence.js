(() => {
  'use strict';

  const DAY = 86400000;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const EXAM = {
    target: 48,
    examName: '48º Exame de Ordem Unificado',
    examDate: '2027-01-10',
    editalExpected: '2026-09-21',
    status: 'awaiting-48-edital',
    statusLabel: 'Estratégia provisória até a publicação do edital do 48º EOU',
    totalQuestions: 80,
    passingScore: 40,
    safeTarget: 45,
    durationMinutes: 300,
    minimumCombinedEthicsHumanPhilosophyPct: 0.15,
    distributionBasis: 'Distribuição operacional baseada no 47º EOU; incidência temática calculada sobre OAB 32–47.',
    methodologyVersion: 1,
    lastCalibrated: '2026-09-11'
  };

  const SUBJECTS = {
    etica:{name:'Ética Profissional',q:8,core:true},
    constitucional:{name:'Direito Constitucional',q:6,core:true},
    civil:{name:'Direito Civil',q:6,core:true},
    'processo-civil':{name:'Processo Civil',q:6,core:true},
    penal:{name:'Direito Penal',q:6,core:true},
    'processo-penal':{name:'Processo Penal',q:6,core:true},
    trabalho:{name:'Direito do Trabalho',q:5,core:true},
    'processo-trabalho':{name:'Processo do Trabalho',q:5,core:true},
    administrativo:{name:'Direito Administrativo',q:5,core:true},
    tributario:{name:'Direito Tributário',q:5,core:true},
    empresarial:{name:'Direito Empresarial',q:4,core:true},
    consumidor:{name:'Direito do Consumidor',q:2,core:false},
    eca:{name:'ECA',q:2,core:false},
    humanos:{name:'Direitos Humanos',q:2,core:false},
    filosofia:{name:'Filosofia do Direito',q:2,core:false},
    internacional:{name:'Direito Internacional',q:2,core:false},
    ambiental:{name:'Direito Ambiental',q:2,core:false},
    eleitoral:{name:'Direito Eleitoral',q:2,core:false},
    previdenciario:{name:'Direito Previdenciário',q:2,core:false},
    financeiro:{name:'Direito Financeiro',q:2,core:false}
  };

  const SUBJECT_ALIASES = {
    processo_civil:'processo-civil', proc_civil:'processo-civil', processual_civil:'processo-civil',
    processo_penal:'processo-penal', proc_penal:'processo-penal', processual_penal:'processo-penal',
    processo_trabalho:'processo-trabalho', proc_trabalho:'processo-trabalho', processual_trabalho:'processo-trabalho',
    direitos_humanos:'humanos', direito_humanos:'humanos', direito_humano:'humanos',
    direito_constitucional:'constitucional', direito_civil:'civil', direito_penal:'penal', direito_tributario:'tributario',
    direito_administrativo:'administrativo', direito_empresarial:'empresarial', direito_do_trabalho:'trabalho',
    direito_consumidor:'consumidor', direito_do_consumidor:'consumidor', direito_ambiental:'ambiental',
    direito_eleitoral:'eleitoral', direito_previdenciario:'previdenciario', direito_financeiro:'financeiro',
    direito_internacional:'internacional', etica_profissional:'etica', estatuto_oab:'etica'
  };

  const TOPICS = {
    etica:[
      ['prerrogativas','Direitos e prerrogativas do advogado',19,['prerrogativas','direitos_prerrogativas','direitos_e_prerrogativas_do_advogado']],
      ['infracoes_disciplinar','Infrações, sanções e processo disciplinar',19,['infracoes_sancoes','processo_disciplinar','infracoes_e_sancoes_disciplinares']],
      ['inscricao_exercicio','Inscrição e exercício profissional',16,['inscricao_oab','licenciamento_cancelamento','estagiario','advogado_empregado','atividades_privativas','estatuto_da_advocacia']],
      ['sociedade_advogados','Sociedade de advogados',15,['sociedade_advogados','sociedade_de_advogados']],
      ['honorarios','Honorários advocatícios',14,['honorarios','honorarios_advocaticios']],
      ['mandato','Mandato, procuração e renúncia',10,['procuracao_mandato','mandato','renuncia_ao_mandato']],
      ['incompatibilidade_impedimento','Incompatibilidades e impedimentos',10,['incompatibilidade_e_impedimento']],
      ['publicidade','Publicidade profissional',10,['publicidade','publicidade_profissional','captacao_de_clientela']],
      ['deveres_sigilo_responsabilidade','Deveres, sigilo e responsabilidade profissional',9,['sigilo_profissional','responsabilidade_do_advogado','prestacao_de_contas','direitos_prerrogativas_e_responsabilidades']],
      ['organizacao_oab','Organização e órgãos da OAB',7,['orgaos_gestao_oab','eleicoes_mandatos_oab','legislacao_oab']]
    ],
    constitucional:[
      ['organizacao_estado','Organização do Estado, federalismo e defesa do Estado',21,['organizacao_do_estado','federalismo','competencia_dos_entes','intervencao_federal','estado_de_defesa','estado_de_sitio']],
      ['controle_constitucionalidade','Controle de constitucionalidade',19,['controle_de_constitucionalidade','adi','ado','adc','adpf','sumulas_vinculantes']],
      ['poderes_processo_legislativo','Poderes e processo legislativo',16,['poderes','processo_legislativo','poder_legislativo','poder_executivo','poder_judiciario']],
      ['direitos_fundamentais','Direitos e garantias fundamentais',14,['direitos_fundamentais','direitos_e_garantias_fundamentais']],
      ['ordem_social_economica','Ordem social e econômica',13,['ordem_economica_social','ordem_economica','saude','educacao','previdencia_e_assistencia_social']],
      ['judiciario_funcoes_essenciais','Judiciário, funções essenciais e precatórios',10,['organizacao_poder_judiciario','cnj','funcoes_essenciais']],
      ['remedios_constitucionais','Remédios constitucionais',7,['remedios_constitucionais','habeas_data','mandado_de_seguranca','mandado_de_injuncao','acao_popular']],
      ['nacionalidade_politicos','Nacionalidade e direitos políticos',6,['nacionalidade','direitos_politicos','inelegibilidades']]
    ],
    civil:[
      ['parte_geral','Parte geral: pessoas, bens e negócio jurídico',19,['pessoas_negocio_juridico','pessoas','bens','negocio_juridico']],
      ['contratos','Contratos',18,['contratos','formacao_dos_contratos']],
      ['familia','Direito de família',17,['familia','casamento','uniao_estavel','alimentos','guarda']],
      ['direitos_reais','Direitos reais, posse e propriedade',14,['direitos_reais','posse','propriedade','usucapiao']],
      ['sucessoes','Sucessões',13,['sucessoes','familia_e_sucessoes','heranca','testamento']],
      ['responsabilidade_civil','Responsabilidade civil',12,['responsabilidade_civil','atos_ilicitos']],
      ['obrigacoes','Obrigações',10,['obrigacoes','inadimplemento','pagamento']]
    ],
    'processo-civil':[
      ['cumprimento_execucao','Cumprimento de sentença e execução',24,['cumprimento_de_sentenca','cumprimento_sentenca','execucao']],
      ['procedimento_provas_postulacao','Procedimento comum, provas e postulação',17,['procedimento_comum','provas','peticao_inicial','contestacao','revelia']],
      ['recursos','Recursos',16,['recursos','apelacao','agravo_de_instrumento','embargos_de_declaracao']],
      ['procedimentos_especiais','Procedimentos especiais',14,['procedimentos_especiais','acao_monitoria','acoes_possessorias']],
      ['litisconsorcio_terceiros','Litisconsórcio e intervenção de terceiros',8,['litisconsorcio','intervencao_de_terceiros']],
      ['sujeitos_competencia_atos','Sujeitos, competência e atos processuais',7,['competencia','sujeitos_do_processo','atos_processuais']],
      ['tutela_provisoria','Tutela provisória',6,['tutela_provisoria']],
      ['arbitragem_consensual','Arbitragem e solução consensual',6,['arbitragem','mediacao','conciliacao']],
      ['juizados_especiais','Juizados Especiais Cíveis',3,['juizados_especiais','juizado_especial_civel']]
    ],
    tributario:[
      ['competencia_limitacoes','Competência e limitações ao poder de tributar',15,['competencia_tributaria','principios_tributarios','competencia_para_instituir_tributos']],
      ['obrigacao_responsabilidade','Obrigação e responsabilidade tributária',14,['obrigacao_tributaria','responsabilidade','responsabilidade_tributaria','fato_gerador']],
      ['especies_tributarias','Espécies tributárias',13,['conceito_especies_tributarias','impostos','taxas','contribuicoes','emprestimos_compulsorios']],
      ['administracao_processo','Administração e processo tributário',13,['administracao_tributaria','processo_tributario','legislacao_tributaria']],
      ['credito_tributario','Crédito tributário: constituição, suspensão e extinção',11,['credito_tributario','lancamento','suspensao_e_extincao','suspensao_extincao']],
      ['tributos_especie','Tributos em espécie',8,['tributos_em_especie','impostos_em_especie']],
      ['imunidades','Imunidades tributárias',6,['imunidades','imunidades_tributarias']]
    ],
    administrativo:[
      ['licitacoes_contratos','Licitações e contratos administrativos',16,['licitacoes_e_contratos','licitacoes','contratos_administrativos','contratacao_direta']],
      ['intervencao_propriedade','Intervenção do Estado na propriedade',13,['intervencao_na_propriedade','desapropriacao','intervencoes_restritivas']],
      ['organizacao_servicos','Organização administrativa e serviços públicos',12,['organizacao_administrativa','servicos_publicos','autarquias','agencias_reguladoras','empresas_publicas']],
      ['agentes_publicos','Agentes públicos',12,['agentes_publicos','cargos_publicos','processo_administrativo_disciplinar']],
      ['improbidade','Improbidade administrativa',10,['improbidade','improbidade_administrativa']],
      ['atos_administrativos','Atos administrativos',8,['atos_administrativos','ato_administrativo','lindb']],
      ['processo_bens_publicos','Processo administrativo e bens públicos',7,['processo_administrativo','bens_publicos']],
      ['anticorrupcao','Lei Anticorrupção e responsabilidade empresarial',4,['anticorrupcao','responsabilidade_empresarial']],
      ['controle','Controle da Administração e Tribunais de Contas',4,['controle_administrativo','controle_judicial','controle_legislativo','tribunais_de_contas']],
      ['responsabilidade_estado','Responsabilidade civil do Estado',3,['responsabilidade_civil_do_estado','responsabilidade_do_estado']]
    ],
    penal:[
      ['teoria_crime','Teoria do crime',20,['teoria_do_crime','teoria_crime','erro_de_tipo','erro_de_proibicao','excludentes_de_ilicitude']],
      ['iter_concurso','Iter criminis, concurso de pessoas e de crimes',15,['concurso_de_pessoas','concurso_pessoas','iter_criminis','concurso_de_crimes']],
      ['penas_medidas','Penas, medidas de segurança e efeitos da condenação',15,['penas','aplicacao_da_pena','medidas_de_seguranca','efeitos_da_condenacao']],
      ['crimes_pessoa','Crimes contra a pessoa, honra e dignidade sexual',12,['crimes_contra_a_pessoa','crimes_pessoa','dignidade_sexual','crimes_contra_a_honra']],
      ['aplicacao_lei_penal','Aplicação da lei penal',11,['aplicacao_da_lei_penal','lei_penal_no_tempo','territorialidade']],
      ['leis_penais_especiais','Leis penais especiais',9,['leis_penais_especiais']],
      ['crimes_patrimonio','Crimes contra o patrimônio',7,['crimes_patrimoniais','crimes_contra_o_patrimonio']],
      ['crimes_administracao','Crimes contra a Administração Pública',5,['administracao_publica','crimes_contra_a_administracao_publica']]
    ],
    'processo-penal':[
      ['investigacao_acao','Investigação e ação penal',22,['inquerito_policial','acao_penal','investigacao','anpp']],
      ['prisoes_cautelares','Prisões e medidas cautelares',15,['prisoes_e_cautelares','prisoes','medidas_cautelares']],
      ['provas','Provas',14,['provas']],
      ['recursos_hc','Recursos e habeas corpus',10,['recursos','habeas_corpus','apelacao','embargos_infringentes']],
      ['execucao_penal','Execução penal',10,['execucao_da_pena','execucao_penal','lei_de_execucao_penal']],
      ['competencia','Competência',9,['competencia','jurisdicao_e_competencia']],
      ['sujeitos_atos_nulidades','Sujeitos, atos processuais e nulidades',9,['atos_processuais','nulidades','comunicacao_dos_atos_processuais']],
      ['juri','Tribunal do Júri',8,['tribunal_do_juri','crimes_dolosos_contra_a_vida']]
    ],
    trabalho:[
      ['relacao_contrato','Relação de emprego e contrato de trabalho',18,['relacao_de_emprego','relacao_emprego','contrato_trabalho','contrato_de_trabalho']],
      ['jornada_descanso','Jornada, férias e descansos',18,['jornada','jornada_de_trabalho','ferias','horas_extras','intervalo']],
      ['alteracao_suspensao','Alteração, suspensão e interrupção contratual',14,['alteracao_contratual','suspensao_do_contrato','interrupcao_do_contrato']],
      ['terminacao_estabilidade','Extinção contratual e estabilidades',14,['rescisao','terminacao','estabilidades','estabilidade']],
      ['remuneracao','Remuneração, salário e adicionais',13,['remuneracao','remuneracao_e_salario','salario','adicionais']],
      ['saude_protecao','Saúde, segurança e proteção do trabalhador',6,['seguranca_e_saude','protecao_do_trabalhador']],
      ['coletivo','Direito coletivo do trabalho',3,['direito_coletivo','sindicatos','negociacao_coletiva']]
    ],
    'processo-trabalho':[
      ['recursos','Recursos trabalhistas',21,['recursos','recurso_ordinario','recurso_de_revista','agravo_de_peticao']],
      ['procedimento_audiencia','Procedimento, audiência e nulidades',18,['procedimentos','audiencia','nulidades','atos_prazos_nulidades']],
      ['execucao_liquidacao','Execução e liquidação',17,['execucao_trabalhista','execucao','liquidacao_de_sentenca']],
      ['acoes_especiais','Ações e procedimentos especiais',10,['acoes_especiais','procedimentos_especiais','dissidio_coletivo']],
      ['provas','Provas e ônus da prova',5,['provas','onus_da_prova']],
      ['custas_honorarios','Custas, honorários e justiça gratuita',5,['custas','honorarios','justica_gratuita']],
      ['competencia','Competência da Justiça do Trabalho',4,['competencia','competencia_da_justica_do_trabalho']]
    ],
    empresarial:[
      ['sociedades','Sociedades',18,['sociedades','sociedade_simples','sociedade_limitada','sociedade_anonima']],
      ['recuperacao_falencia','Recuperação judicial e falência',15,['recuperacao_judicial','falencia','recuperacao_e_falencia']],
      ['empresario_registro','Empresário e registro empresarial',10,['empresario','empresa_empresario_registro']],
      ['estabelecimento_nome','Estabelecimento e nome empresarial',8,['estabelecimento','nome_empresarial','estabelecimento_e_nome_empresarial']],
      ['titulos_credito','Títulos de crédito',8,['titulos_de_credito','titulos_credito','cheque','duplicata']],
      ['contratos_empresariais','Contratos empresariais',6,['contratos_empresariais','contratos']],
      ['propriedade_intelectual','Propriedade intelectual',4,['propriedade_intelectual','marca','patente']]
    ]
  };

  const TOPIC_TOTALS = Object.fromEntries(Object.entries(TOPICS).map(([subject, rows]) => [subject, rows.reduce((n, row) => n + row[2], 0)]));
  const ACTIONS = {
    diagnostic:{label:'Diagnóstico dirigido',minutes:12,questionCount:5,description:'Questões sem consulta para medir domínio real antes de consumir teoria.'},
    theory:{label:'Teoria cirúrgica + questões',minutes:30,questionCount:5,description:'Revisão curta do conceito exato que falhou, seguida imediatamente de recuperação ativa.'},
    guided:{label:'Questões guiadas',minutes:20,questionCount:8,description:'Prática deliberada com correção causal e comparação dos distratores.'},
    timed:{label:'Bloco cronometrado',minutes:18,questionCount:8,description:'Treino de leitura, decisão e tempo; pouca teoria, mais execução de prova.'},
    review:{label:'Revisão espaçada',minutes:12,questionCount:5,description:'Recuperar erros vencidos sem releitura prévia e recalibrar o intervalo.'},
    maintenance:{label:'Manutenção intercalada',minutes:18,questionCount:8,description:'Questões mistas para preservar pontos já conquistados e evitar falsa fluência.'}
  };

  function canonicalSubject(value){
    const n = norm(value);
    if (SUBJECTS[n]) return n;
    if (SUBJECT_ALIASES[n]) return SUBJECT_ALIASES[n];
    const hyphen = n.replace(/_/g, '-');
    return SUBJECTS[hyphen] ? hyphen : n;
  }

  function tokens(value){ return new Set(norm(value).split('_').filter(x => x.length > 2)); }
  function similarity(a,b){
    const A=tokens(a),B=tokens(b); if(!A.size||!B.size) return 0;
    let hit=0; for(const x of A) if(B.has(x)) hit++;
    return hit/(A.size+B.size-hit);
  }

  function topicObjects(subject){
    const s=canonicalSubject(subject), total=TOPIC_TOTALS[s]||1;
    const rows=TOPICS[s];
    if(!rows) return [{id:'geral',label:'Conteúdo geral',historicalCount:1,historicalShare:1,aliases:['geral']}];
    return rows.map(row=>({id:row[0],label:row[1],historicalCount:row[2],historicalShare:row[2]/total,aliases:row[3]||[]}));
  }

  function resolveTopic(subject, raw){
    const value=norm(raw); if(!value) return null;
    const topics=topicObjects(subject);
    for(const t of topics){
      const candidates=[t.id,t.label,...t.aliases].map(norm);
      if(candidates.includes(value)) return t;
    }
    let best=null,bestScore=0;
    for(const t of topics){
      const candidates=[t.id,t.label,...t.aliases];
      const score=Math.max(...candidates.map(c=>similarity(value,c)));
      if(score>bestScore){bestScore=score;best=t;}
    }
    return bestScore>=0.5?best:null;
  }

  function materialInfo(subject, topic){
    const catalog=window.OAB_LEARNING_MATERIALS;
    if(!catalog) return {priority:0,available:false,formats:[],sourceCount:0};
    const key=canonicalSubject(subject).replace(/-/g,'_');
    const entry=catalog.topicCatalog?.[key];
    if(!entry) return {priority:0,available:false,formats:[],sourceCount:0};
    const target=typeof topic==='string'?resolveTopic(subject,topic):topic;
    if(!target) return {priority:0,available:false,formats:entry.formats||[],sourceCount:(entry.indexedFrom||[]).length};
    let priority=0, matches=0;
    for(const item of entry.items||[]){
      const values=[item.id,item.label,...(item.aliases||[])];
      const score=Math.max(...values.map(v=>Math.max(similarity(v,target.id),similarity(v,target.label),...(target.aliases||[]).map(a=>similarity(v,a)))));
      if(score>=0.5){matches++;priority=Math.max(priority,Number(item.priority||0));}
    }
    return {priority,available:matches>0,formats:entry.formats||[],sourceCount:(entry.indexedFrom||[]).length,matches};
  }

  function recencyWeight(ts){
    if(!ts) return 0.8;
    const age=Math.max(0,(Date.now()-Number(ts))/DAY);
    return 0.35 + 0.65*Math.pow(0.5,age/60);
  }
  function errorCauseWeight(cause){
    return cause==='knowledge'?1.25:cause==='confusion'?1.12:cause==='reading'?0.72:1;
  }

  function evidence(attempts){
    const rows=Array.isArray(attempts)?attempts:[];
    let alpha=2,beta=3,weightedN=0,correct=0,wrong=0,knowledge=0,confusion=0,reading=0,slow=0;
    for(const a of rows){
      const w=recencyWeight(a.ts); weightedN+=w;
      if(a.correct){alpha+=w;correct++;}
      else{
        beta+=w*errorCauseWeight(a.cause);wrong++;
        if(a.cause==='knowledge')knowledge++; if(a.cause==='confusion')confusion++; if(a.cause==='reading')reading++;
      }
      if(Number(a.timeMs)>225000)slow++;
    }
    const sum=alpha+beta, estimated=alpha/sum;
    const uncertainty=Math.sqrt((alpha*beta)/(sum*sum*(sum+1)));
    return {n:rows.length,correct,wrong,raw:rows.length?correct/rows.length:0,alpha,beta,weightedN,estimated,uncertainty,knowledge,confusion,reading,slow,
      knowledgeRate:wrong?knowledge/wrong:0,confusionRate:wrong?confusion/wrong:0,readingRate:wrong?reading/wrong:0};
  }

  function reviewDebt(state, subject, topic){
    const rows=Object.values(state?.reviews||{}).filter(r=>!r.mastered && canonicalSubject(r.subject)===canonicalSubject(subject));
    const target=typeof topic==='string'?resolveTopic(subject,topic):topic;
    const matched=target?rows.filter(r=>resolveTopic(subject,r.topic)?.id===target.id):rows;
    const due=matched.filter(r=>Number(r.due||0)<=Date.now()).length;
    return {open:matched.length,due};
  }

  function subjectStats(state, subject){
    const id=canonicalSubject(subject), s=SUBJECTS[id]||{q:1};
    const attempts=(state?.attempts||[]).filter(a=>canonicalSubject(a.subject)===id);
    const ev=evidence(attempts), debt=reviewDebt(state,id,null);
    const target=.78;
    const potential=s.q*Math.max(0,target-ev.estimated);
    const predictiveVar=s.q*ev.alpha*ev.beta*(ev.alpha+ev.beta+s.q)/((ev.alpha+ev.beta)**2*(ev.alpha+ev.beta+1));
    return {...ev,...debt,potential,predictiveVar};
  }

  function topicStats(state, subject, topic){
    const id=canonicalSubject(subject), resolved=typeof topic==='string'?resolveTopic(id,topic):topic;
    const attempts=(state?.attempts||[]).filter(a=>canonicalSubject(a.subject)===id && resolved && resolveTopic(id,a.topic)?.id===resolved.id);
    const ev=evidence(attempts), debt=reviewDebt(state,id,resolved);
    return {...ev,...debt};
  }

  function chooseAction(st){
    if(st.due>0 && st.estimated>=.62) return 'review';
    if(st.weightedN<2.25) return 'diagnostic';
    if(st.estimated<.60 && (st.knowledgeRate+st.confusionRate)>=.35) return 'theory';
    if(st.readingRate>=.45 && st.wrong>=2) return 'timed';
    if(st.estimated<.80) return 'guided';
    return 'maintenance';
  }

  function topicPriority(state, subject, topic){
    const s=SUBJECTS[canonicalSubject(subject)]||{q:1}, t=typeof topic==='string'?resolveTopic(subject,topic):topic;
    const st=topicStats(state,subject,t), material=materialInfo(subject,t);
    const examValue=s.q*(t?.historicalShare||1);
    const gap=clamp(.82-st.estimated,0.04,.65);
    const uncertaintyBoost=1+st.uncertainty*1.7;
    const sparseBoost=st.weightedN<3?1.16:st.weightedN<6?1.06:1;
    const errorBoost=1+st.knowledgeRate*.22+st.confusionRate*.12+st.readingRate*.04;
    const reviewBoost=1+Math.min(.28,st.due*.07+st.open*.015);
    // Material é sinal secundário: a incidência FGV continua dominando a decisão.
    const materialBoost=material.available?(1.02+material.priority*.025):.98;
    const score=examValue*(.28+gap*1.75)*uncertaintyBoost*sparseBoost*errorBoost*reviewBoost*materialBoost;
    const recoverable=examValue*Math.max(0,.82-st.estimated);
    const actionId=chooseAction(st), action=ACTIONS[actionId];
    const pointsPerHour=action.minutes?recoverable/action.minutes*60:0;
    return {subject:canonicalSubject(subject),subjectName:s.name||subject,topic:t||{id:'geral',label:'Conteúdo geral',historicalShare:1,historicalCount:1},stats:st,material,examValue,score,recoverable,pointsPerHour,actionId,action};
  }

  function allowedSubjects(strategy='core'){
    const all=Object.keys(SUBJECTS);
    return strategy==='balanced'?all:all.filter(id=>SUBJECTS[id].core);
  }

  function rankTopics(state,{strategy='core',subject=null}={}){
    const ids=subject?[canonicalSubject(subject)]:allowedSubjects(strategy);
    const out=[];
    for(const id of ids){
      for(const topic of topicObjects(id)) out.push(topicPriority(state,id,topic));
    }
    return out.sort((a,b)=>b.score-a.score);
  }

  function rankSubjects(state,{strategy='core'}={}){
    const topics=rankTopics(state,{strategy}), grouped={};
    for(const t of topics){(grouped[t.subject] ||= []).push(t);}
    return allowedSubjects(strategy).map(id=>{
      const s=SUBJECTS[id],st=subjectStats(state,id),ts=(grouped[id]||[]).sort((a,b)=>b.score-a.score);
      const top=ts[0]||null;
      const focus=(ts.slice(0,3).reduce((n,x)=>n+x.score,0)||s.q*(1-st.estimated));
      return {id,name:s.name,q:s.q,core:s.core,stats:st,focus,topTopic:top,potential:st.potential};
    }).sort((a,b)=>b.focus-a.focus);
  }

  function recommendations(state,{strategy='core',limit=5}={}){
    const ranked=rankTopics(state,{strategy}), out=[], used=new Map();
    for(const item of ranked){
      const count=used.get(item.subject)||0;
      if(count>=1 && out.length<Math.min(limit,allowedSubjects(strategy).length)) continue;
      out.push(item);used.set(item.subject,count+1);
      if(out.length>=limit) break;
    }
    if(out.length<limit){
      for(const item of ranked){if(out.includes(item))continue;out.push(item);if(out.length>=limit)break;}
    }
    const max=out[0]?.score||1;
    return out.map(x=>({...x,priorityIndex:Math.round(100*x.score/max)}));
  }

  function readiness(state){
    const subjectRows=Object.keys(SUBJECTS).map(id=>({id,s:SUBJECTS[id],st:subjectStats(state,id)}));
    const projected=subjectRows.reduce((n,x)=>n+x.s.q*x.st.estimated,0);
    const coreTopics=rankTopics(state,{strategy:'core'});
    const totalCoreWeight=coreTopics.reduce((n,x)=>n+x.examValue,0)||62;
    const coveredWeight=coreTopics.filter(x=>x.stats.weightedN>=2.25).reduce((n,x)=>n+x.examValue,0);
    const robustWeight=coreTopics.filter(x=>x.stats.weightedN>=5 && x.stats.estimated>=.72).reduce((n,x)=>n+x.examValue,0);
    const fragileWeight=coreTopics.filter(x=>x.stats.estimated>=.74 && x.stats.weightedN<4).reduce((n,x)=>n+x.examValue,0);
    const due=Object.values(state?.reviews||{}).filter(r=>!r.mastered && Number(r.due||0)<=Date.now()).length;
    return {projected,coverage:coveredWeight/totalCoreWeight,robust:robustWeight/totalCoreWeight,fragilePoints:fragileWeight,due,totalAttempts:(state?.attempts||[]).length};
  }

  function questionKey(q){ return q?.ruleId || q?.sourceQuestionId || q?.officialQuestionId || q?.id; }
  function sourceQuality(q){
    if(q?.official || q?.origin==='official-fgv') return 1.18;
    if(q?.verified===true || q?.verification?.verified===true) return 1.08;
    if(q?.quality && /editorial/i.test(q.quality)) return 1.04;
    return 1;
  }

  function selectAdaptiveQuestions(questions,state,{limit=10,strategy='core',subject='all'}={}){
    const allowed=subject==='all'?new Set(allowedSubjects(strategy)):new Set([canonicalSubject(subject)]);
    const attempts=state?.attempts||[];
    const seen=new Map(); attempts.forEach(a=>seen.set(a.qid,(seen.get(a.qid)||0)+1));
    const topicRank=rankTopics(state,{strategy});
    const topicScore=new Map(topicRank.map(x=>[`${x.subject}|${x.topic.id}`,x.score]));
    const candidates=(questions||[]).filter(q=>allowed.has(canonicalSubject(q.subject))).map(q=>{
      const sid=canonicalSubject(q.subject),t=resolveTopic(sid,q.topic),base=topicScore.get(`${sid}|${t?.id||'geral'}`)||SUBJECTS[sid]?.q||1;
      const repetition=seen.get(q.id)||0;
      const novelty=repetition===0?1:repetition===1?.52:.28;
      const jitter=.94+Math.random()*.12;
      return {q,score:base*sourceQuality(q)*novelty*jitter,topicId:t?.id||'geral',sid,key:questionKey(q)};
    }).sort((a,b)=>b.score-a.score);
    const out=[],keys=new Set(),topicCounts=new Map();
    for(const row of candidates){
      if(keys.has(row.key)) continue;
      const tk=`${row.sid}|${row.topicId}`,count=topicCounts.get(tk)||0;
      if(count>=2 && out.length<Math.ceil(limit*.75)) continue;
      out.push(row.q);keys.add(row.key);topicCounts.set(tk,count+1);
      if(out.length>=limit) break;
    }
    return out;
  }

  function explainRecommendation(item){
    if(!item) return '';
    const s=item.stats,t=item.topic;
    const sample=s.n?`${s.n} resposta${s.n===1?'':'s'} no tema`:'tema ainda sem amostra';
    const incidence=`${Math.round(t.historicalShare*100)}% da incidência histórica da matéria`;
    const material=item.material.available?`material indexado ${item.material.priority}/3`:'material específico ainda não indexado';
    const error=s.wrong?`, ${Math.round((s.knowledgeRate+s.confusionRate)*100)}% dos erros por regra/confusão`:'';
    return `${incidence} • ${sample} • domínio estimado ${Math.round(s.estimated*100)}%${error} • ${material}.`;
  }

  window.OAB_INTELLIGENCE = {
    version:1,EXAM,SUBJECTS,TOPICS,ACTIONS,
    normalize:norm,canonicalSubject,topicObjects,resolveTopic,materialInfo,
    evidence,subjectStats,topicStats,topicPriority,rankTopics,rankSubjects,recommendations,readiness,
    selectAdaptiveQuestions,explainRecommendation
  };
})();
