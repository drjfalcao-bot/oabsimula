(() => {
  'use strict';

  // Catálogo pedagógico derivado do acervo privado importado. Não contém links,
  // IDs de arquivos ou conteúdo proprietário; serve para orientar o motor de estudo.
  window.OAB_LEARNING_MATERIALS = {
    version: 1,
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
          'Mentorias'
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
    }
  };
})();
