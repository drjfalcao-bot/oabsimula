(() => {
  'use strict';

  // Catálogo pedagógico derivado do acervo privado importado. Não contém links,
  // IDs de arquivos ou conteúdo proprietário; serve para orientar o motor de estudo.
  window.OAB_LEARNING_MATERIALS = {
    version: 5,
    lastScan: '2026-09-11',
    privacy: 'private-source-metadata-only',
    dataIntegrityNotes: [
      'A classificação usa o conteúdo real dos arquivos, não apenas o nome da pasta.',
      'Pastas com rótulo incorreto foram reclassificadas semanticamente antes de entrarem no catálogo.',
      'A prioridade do curso é um sinal secundário; a incidência histórica FGV é tratada separadamente pelo motor de inteligência.'
    ],
    cycle: [
      {id:'diagnostico',label:'Diagnóstico curto',minutes:7,description:'Comece sem consultar teoria. Use 3 a 5 questões para revelar lacunas reais.'},
      {id:'teoria',label:'Teoria direcionada',minutes:20,description:'Estude apenas o conceito que apareceu como lacuna. Priorize aula teórica ou explicação objetiva.'},
      {id:'consolidacao',label:'Consolidação',minutes:8,description:'Feche o bloco com resumo, mapa mental ou caderno legislativo e recupere a regra sem olhar.'},
      {id:'questoes',label:'Bateria de questões',minutes:15,description:'Resolva novas questões do mesmo tema e registre a causa de cada erro.'},
      {id:'checkpoint',label:'Checkpoint e revisão',minutes:5,description:'Agende a revisão espaçada e volte ao tema em 1, 3, 7, 14 e 30 dias conforme o domínio.'}
    ],
    sources: {
      vde: {
        name:'VDE 120 Dias — Exame 48',
        collections:['Como estudar','Resumo','Mapas mentais','Cadernos legislativos','Aulas teóricas','Revisão','Simulados','Cronograma 120 dias'],
        theorySubjects:['constitucional','trabalho','civil','tributario','processo_trabalho','penal']
      },
      ceisc: {
        name:'CEISC Extensivo Premium 48',
        collections:['Comece seus estudos','Bateria de questões','Simulados','Checkpoint — revisão guiada','Cronograma de estudos','Mentorias','TAQ — Técnica de Aprovação por Questões'],
        subjects:['etica','constitucional','penal','processo_penal','tributario','trabalho','processo_trabalho','civil','processo_civil','administrativo','empresarial','eleitoral','financeiro','previdenciario','direitos_humanos']
      }
    },
    subjectNames: {
      etica:'Ética',constitucional:'Direito Constitucional',penal:'Direito Penal',processo_penal:'Processo Penal',
      tributario:'Direito Tributário',trabalho:'Direito do Trabalho',processo_trabalho:'Processo do Trabalho',civil:'Direito Civil',
      processo_civil:'Processo Civil',administrativo:'Direito Administrativo',empresarial:'Direito Empresarial',eleitoral:'Direito Eleitoral',
      financeiro:'Direito Financeiro',previdenciario:'Direito Previdenciário',direitos_humanos:'Direitos Humanos'
    },
    topicCatalog: {
      etica: {
        indexedFrom:['CEISC'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'legislacao_oab',label:'Legislação da Ordem dos Advogados',priority:1,aliases:['estatuto_da_advocacia']},
          {id:'orgaos_gestao_oab',label:'Órgãos de gestão da OAB',priority:3},
          {id:'eleicoes_mandatos_oab',label:'Eleições e mandatos na OAB',priority:1},
          {id:'inscricao_oab',label:'Inscrição na OAB',priority:2},
          {id:'licenciamento_cancelamento',label:'Licenciamento e cancelamento da inscrição',priority:1},
          {id:'estagiario',label:'Estagiário',priority:1},{id:'advogado_empregado',label:'Advogado empregado',priority:2},
          {id:'atividades_privativas',label:'Atividades privativas do advogado',priority:2},
          {id:'sociedade_advogados',label:'Sociedade de advogados',priority:3},{id:'procuracao_mandato',label:'Procuração e mandato',priority:3},
          {id:'honorarios',label:'Honorários advocatícios',priority:3,aliases:['honorarios']},{id:'advocacia_pro_bono',label:'Advocacia pro bono',priority:1},
          {id:'prerrogativas',label:'Direitos, prerrogativas e responsabilidades',priority:3,aliases:['prerrogativas']},
          {id:'publicidade',label:'Publicidade profissional',priority:3,aliases:['publicidade']},
          {id:'infracoes_sancoes',label:'Infrações e sanções disciplinares',priority:3},
          {id:'processo_disciplinar',label:'Processo disciplinar',priority:3,aliases:['processo_disciplinar']},
          {id:'incompatibilidade_impedimento',label:'Incompatibilidade e impedimento',priority:2,aliases:['incompatibilidade_e_impedimento']}
        ]
      },
      constitucional: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'teoria_constituicao',label:'Teoria da Constituição e poder constituinte',priority:2},{id:'eficacia_normas',label:'Eficácia das normas constitucionais',priority:2},
          {id:'direitos_fundamentais',label:'Direitos e garantias fundamentais',priority:3,aliases:['direitos_fundamentais']},{id:'nacionalidade',label:'Nacionalidade',priority:2},
          {id:'direitos_politicos',label:'Direitos políticos',priority:2},{id:'organizacao_estado',label:'Organização do Estado e federalismo',priority:3,aliases:['organizacao_do_estado']},
          {id:'poderes',label:'Poderes Legislativo, Executivo e Judiciário',priority:3,aliases:['poderes']},{id:'processo_legislativo',label:'Processo legislativo',priority:3,aliases:['processo_legislativo']},
          {id:'controle_constitucionalidade',label:'Controle de constitucionalidade',priority:3,aliases:['controle_de_constitucionalidade']},
          {id:'remedios_constitucionais',label:'Remédios constitucionais',priority:3,aliases:['remedios_constitucionais']},{id:'ordem_economica_social',label:'Ordem econômica e social',priority:3}
        ]
      },
      tributario: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'conceito_especies_tributarias',label:'Conceito e espécies tributárias',priority:3},{id:'competencia_tributaria',label:'Competência tributária',priority:2,aliases:['competencia_tributaria']},
          {id:'principios_tributarios',label:'Princípios e limitações ao poder de tributar',priority:3},{id:'imunidades',label:'Imunidades tributárias',priority:3,aliases:['imunidades']},
          {id:'obrigacao_tributaria',label:'Obrigação tributária, fato gerador e sujeitos',priority:2},{id:'reforma_principios',label:'Novos princípios da Reforma Tributária',priority:1}
        ]
      },
      penal: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'teoria_crime',label:'Teoria do crime',priority:3,aliases:['teoria_do_crime']},{id:'concurso_pessoas',label:'Concurso de pessoas',priority:3,aliases:['concurso_de_pessoas']},
          {id:'penas',label:'Penas e aplicação da pena',priority:2,aliases:['penas']},{id:'extincao_punibilidade',label:'Extinção da punibilidade e prescrição',priority:2,aliases:['extincao_da_punibilidade']},
          {id:'crimes_pessoa',label:'Crimes contra a pessoa',priority:2,aliases:['crimes_contra_a_pessoa']},{id:'crimes_patrimoniais',label:'Crimes patrimoniais',priority:3,aliases:['crimes_patrimoniais']},
          {id:'dignidade_sexual',label:'Crimes contra a dignidade sexual',priority:3},{id:'administracao_publica',label:'Crimes contra a Administração Pública e Justiça',priority:1}
        ]
      },
      civil: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'obrigacoes',label:'Obrigações',priority:3,aliases:['obrigacoes']},{id:'contratos',label:'Contratos',priority:3,aliases:['contratos']},
          {id:'responsabilidade_civil',label:'Responsabilidade civil',priority:3,aliases:['responsabilidade_civil']},{id:'prescricao_decadencia',label:'Prescrição e decadência',priority:2,aliases:['prescricao_e_decadencia']},
          {id:'direitos_reais',label:'Direitos reais, posse e propriedade',priority:3,aliases:['direitos_reais']},{id:'familia_sucessoes',label:'Família e sucessões',priority:3,aliases:['familia_e_sucessoes']},
          {id:'pessoas_negocio_juridico',label:'Pessoas e negócio jurídico',priority:3}
        ]
      },
      trabalho: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'relacao_emprego',label:'Relação de emprego',priority:3,aliases:['relacao_de_emprego']},{id:'contrato_trabalho',label:'Contrato de trabalho',priority:3},
          {id:'jornada',label:'Jornada de trabalho',priority:3,aliases:['jornada']},{id:'remuneracao',label:'Remuneração e salário',priority:3,aliases:['remuneracao']},
          {id:'prescricao_trabalhista',label:'Prescrição trabalhista',priority:2}
        ]
      },
      processo_civil: {
        indexedFrom:['CEISC'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'competencia',label:'Competência',priority:1,aliases:['competencia']},{id:'tutela_provisoria',label:'Tutela provisória',priority:3,aliases:['tutela_provisoria']},
          {id:'procedimento_comum',label:'Procedimento comum',priority:3,aliases:['procedimento_comum']},{id:'recursos',label:'Recursos',priority:3,aliases:['recursos']},
          {id:'cumprimento_sentenca',label:'Cumprimento de sentença',priority:3,aliases:['cumprimento_de_sentenca']},{id:'execucao',label:'Execução',priority:3,aliases:['execucao']},
          {id:'juizados_especiais',label:'Juizados Especiais Cíveis',priority:3}
        ]
      },
      processo_trabalho: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'competencia',label:'Competência da Justiça do Trabalho',priority:2,aliases:['competencia']},{id:'procedimentos',label:'Procedimentos trabalhistas',priority:3,aliases:['procedimentos']},
          {id:'audiencia',label:'Audiência',priority:3,aliases:['audiencia']},{id:'provas',label:'Provas',priority:3,aliases:['provas']},
          {id:'recursos',label:'Recursos trabalhistas',priority:3,aliases:['recursos']},{id:'execucao_trabalhista',label:'Execução trabalhista',priority:3,aliases:['execucao_trabalhista']}
        ]
      },
      processo_penal: {
        indexedFrom:['CEISC'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'investigacao_acao',label:'Inquérito policial e ação penal',priority:3,aliases:['inquerito_policial','acao_penal']},
          {id:'prisoes_cautelares',label:'Prisões e medidas cautelares',priority:3,aliases:['prisoes','prisoes_e_cautelares']},
          {id:'provas',label:'Provas',priority:3,aliases:['provas']},{id:'recursos_hc',label:'Recursos e habeas corpus',priority:3,aliases:['recursos','habeas_corpus','apelacao']},
          {id:'execucao_penal',label:'Execução penal',priority:2,aliases:['execucao_penal','lei_de_execucao_penal']},{id:'competencia',label:'Jurisdição e competência',priority:3,aliases:['competencia']},
          {id:'sujeitos_atos_nulidades',label:'Atos processuais e nulidades',priority:1,aliases:['atos_processuais','nulidades']},{id:'juri',label:'Tribunal do Júri',priority:3,aliases:['crimes_dolosos_contra_a_vida']}
        ]
      },
      administrativo: {
        indexedFrom:['CEISC'],formats:['Aula teórica','TAQ','PDF'],items:[
          {id:'organizacao_servicos',label:'Organização administrativa e serviços públicos',priority:3,aliases:['autarquias','agencias_reguladoras','empresas_publicas','terceiro_setor']},
          {id:'licitacoes_contratos',label:'Licitações e contratos administrativos',priority:3,aliases:['licitacoes','contratos_administrativos','contratacao_direta']},
          {id:'intervencao_propriedade',label:'Intervenção do Estado na propriedade',priority:3,aliases:['desapropriacao','intervencoes_restritivas']},
          {id:'agentes_publicos',label:'Agentes públicos',priority:3,aliases:['agentes_publicos','processo_administrativo_disciplinar']},
          {id:'improbidade',label:'Improbidade administrativa',priority:3,aliases:['improbidade']},{id:'atos_administrativos',label:'Atos administrativos e LINDB',priority:3,aliases:['atos_administrativos','lindb']},
          {id:'processo_bens_publicos',label:'Processo administrativo e bens públicos',priority:2,aliases:['processo_administrativo','bens_publicos']},
          {id:'anticorrupcao',label:'Responsabilidade empresarial e sanções',priority:2,aliases:['anticorrupcao']},{id:'controle',label:'Controle da Administração',priority:1,aliases:['controle_administrativo','controle_judicial','controle_legislativo']},
          {id:'responsabilidade_estado',label:'Responsabilidade civil do Estado',priority:1,aliases:['responsabilidade_civil_do_estado']}
        ]
      },
      empresarial: {
        indexedFrom:['CEISC','VDE'],formats:['Aula teórica','TAQ','PDF','Caderno legislativo'],items:[
          {id:'sociedades',label:'Direito societário',priority:3,aliases:['sociedade_simples','sociedade_limitada','sociedade_anonima']},
          {id:'recuperacao_falencia',label:'Recuperação judicial e falência',priority:3,aliases:['recuperacao_judicial','falencia']},
          {id:'empresario_registro',label:'Empresa, empresário e registro',priority:2,aliases:['empresario','registro_empresarial']},
          {id:'estabelecimento_nome',label:'Estabelecimento e nome empresarial',priority:3,aliases:['estabelecimento','nome_empresarial']},
          {id:'titulos_credito',label:'Títulos de crédito',priority:3,aliases:['titulos_de_credito','cheque','duplicata']},
          {id:'contratos_empresariais',label:'Contratos empresariais',priority:2,aliases:['contratos_empresariais']}
        ]
      }
    }
  };
})();
