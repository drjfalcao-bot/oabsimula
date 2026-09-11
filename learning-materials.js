(() => {
  'use strict';

  // Catálogo pedagógico derivado do acervo privado importado. Não contém links,
  // IDs de arquivos ou conteúdo proprietário; serve para orientar o motor de estudo.
  window.OAB_LEARNING_MATERIALS = {
    version: 2,
    lastScan: '2026-09-11',
    privacy: 'private-source-metadata-only',
    cycle: [
      {
        id: 'diagnostico',
        label: 'Diagnóstico curto',
        minutes: 7,
        description: 'Comece sem consultar teoria. Use 3 a 5 questões para revelar lacunas reais.'
      },
      {
        id: 'teoria',
        label: 'Teoria direcionada',
        minutes: 20,
        description: 'Estude apenas o conceito que apareceu como lacuna. Priorize aula teórica ou explicação objetiva.'
      },
      {
        id: 'consolidacao',
        label: 'Consolidação',
        minutes: 8,
        description: 'Feche o bloco com resumo, mapa mental ou caderno legislativo e recupere a regra sem olhar.'
      },
      {
        id: 'questoes',
        label: 'Bateria de questões',
        minutes: 15,
        description: 'Resolva novas questões do mesmo tema e registre a causa de cada erro.'
      },
      {
        id: 'checkpoint',
        label: 'Checkpoint e revisão',
        minutes: 5,
        description: 'Agende a revisão espaçada e volte ao tema em 1, 3, 7, 14 e 30 dias conforme o domínio.'
      }
    ],
    sources: {
      vde: {
        name: 'VDE 120 Dias — Exame 48',
        collections: [
          'Como estudar',
          'Resumo',
          'Mapas mentais',
          'Cadernos legislativos',
          'Aulas teóricas',
          'Revisão',
          'Simulados',
          'Cronograma 120 dias'
        ],
        theorySubjects: [
          'constitucional',
          'trabalho',
          'civil',
          'tributario',
          'processo_trabalho',
          'penal'
        ]
      },
      ceisc: {
        name: 'CEISC Extensivo Premium 48',
        collections: [
          'Comece seus estudos',
          'Bateria de questões',
          'Simulados',
          'Checkpoint — revisão guiada',
          'Cronograma de estudos',
          'Mentorias',
          'TAQ — Técnica de Aprovação por Questões'
        ],
        subjects: [
          'etica',
          'constitucional',
          'penal',
          'processo_penal',
          'tributario',
          'trabalho',
          'processo_trabalho',
          'civil',
          'processo_civil',
          'administrativo',
          'empresarial',
          'eleitoral',
          'financeiro',
          'previdenciario',
          'direitos_humanos'
        ]
      }
    },
    subjectNames: {
      etica: 'Ética',
      constitucional: 'Direito Constitucional',
      penal: 'Direito Penal',
      processo_penal: 'Processo Penal',
      tributario: 'Direito Tributário',
      trabalho: 'Direito do Trabalho',
      processo_trabalho: 'Processo do Trabalho',
      civil: 'Direito Civil',
      processo_civil: 'Processo Civil',
      administrativo: 'Direito Administrativo',
      empresarial: 'Direito Empresarial',
      eleitoral: 'Direito Eleitoral',
      financeiro: 'Direito Financeiro',
      previdenciario: 'Direito Previdenciário',
      direitos_humanos: 'Direitos Humanos'
    },
    topicCatalog: {
      etica: {
        indexedFrom: ['CEISC'],
        formats: ['Aula teórica', 'TAQ', 'PDF'],
        items: [
          {id:'legislacao_oab', label:'Legislação da Ordem dos Advogados', priority:1, aliases:['estatuto_da_advocacia']},
          {id:'orgaos_gestao_oab', label:'Órgãos de gestão da OAB', priority:3},
          {id:'eleicoes_mandatos_oab', label:'Eleições e mandatos na OAB', priority:1},
          {id:'inscricao_oab', label:'Inscrição na OAB', priority:2},
          {id:'licenciamento_cancelamento', label:'Licenciamento e cancelamento da inscrição', priority:1},
          {id:'estagiario', label:'Estagiário', priority:1},
          {id:'advogado_empregado', label:'Advogado empregado', priority:2},
          {id:'atividades_privativas', label:'Atividades privativas do advogado', priority:2},
          {id:'sociedade_advogados', label:'Sociedade de advogados', priority:3},
          {id:'procuracao_mandato', label:'Procuração e mandato', priority:3},
          {id:'honorarios', label:'Honorários advocatícios', priority:3, aliases:['honorarios']},
          {id:'advocacia_pro_bono', label:'Advocacia pro bono', priority:1},
          {id:'prerrogativas', label:'Direitos, prerrogativas e responsabilidades', priority:3, aliases:['prerrogativas']},
          {id:'publicidade', label:'Publicidade profissional', priority:3, aliases:['publicidade']},
          {id:'infracoes_sancoes', label:'Infrações e sanções disciplinares', priority:3},
          {id:'processo_disciplinar', label:'Processo disciplinar', priority:3, aliases:['processo_disciplinar']},
          {id:'incompatibilidade_impedimento', label:'Incompatibilidade e impedimento', priority:2, aliases:['incompatibilidade_e_impedimento']}
        ]
      },
      constitucional: {
        indexedFrom: ['CEISC', 'VDE'],
        formats: ['Aula teórica', 'TAQ', 'PDF'],
        items: [
          {id:'teoria_constituicao', label:'Teoria da Constituição e poder constituinte', priority:2},
          {id:'eficacia_normas', label:'Eficácia das normas constitucionais', priority:2},
          {id:'direitos_fundamentais', label:'Direitos e garantias fundamentais', priority:3, aliases:['direitos_fundamentais']},
          {id:'nacionalidade', label:'Nacionalidade', priority:2},
          {id:'direitos_politicos', label:'Direitos políticos', priority:2},
          {id:'organizacao_estado', label:'Organização do Estado e federalismo', priority:3, aliases:['organizacao_do_estado']},
          {id:'poderes', label:'Poderes Legislativo, Executivo e Judiciário', priority:3, aliases:['poderes']},
          {id:'processo_legislativo', label:'Processo legislativo', priority:3, aliases:['processo_legislativo']},
          {id:'controle_constitucionalidade', label:'Controle de constitucionalidade', priority:3, aliases:['controle_de_constitucionalidade']},
          {id:'remedios_constitucionais', label:'Remédios constitucionais', priority:3, aliases:['remedios_constitucionais']},
          {id:'ordem_economica_social', label:'Ordem econômica e social', priority:3}
        ]
      }
    }
  };
})();
