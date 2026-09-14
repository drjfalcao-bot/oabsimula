(() => {
  'use strict';

  const root = window.OAB_LEARNING_MATERIALS ||= { topicCatalog: {} };
  root.topicCatalog ||= {};

  const add = (subject, formats, items) => {
    if (root.topicCatalog[subject]) return;
    root.topicCatalog[subject] = {
      indexedFrom: ['Drive privado'],
      formats,
      items: items.map(([id, label, aliases = []]) => ({ id, label, priority: 2, aliases }))
    };
  };

  add('eleitoral', ['Curso', 'Resumo', 'Mapa mental', 'Caderno legislativo'], [
    ['direitos_politicos', 'Direitos políticos', ['sufragio', 'voto', 'alistamento', 'elegibilidade']],
    ['inelegibilidades', 'Inelegibilidades', ['direitos_politicos_negativos']],
    ['candidatura', 'Registro e condições de candidatura', ['registro_de_candidatura', 'convencoes_partidarias']],
    ['partidos', 'Partidos, filiação e domicílio eleitoral', ['filiacao_partidaria', 'domicilio_eleitoral']],
    ['propaganda', 'Propaganda e campanha eleitoral', ['propaganda_eleitoral']],
    ['processo_eleitoral', 'Processo e Justiça Eleitoral', ['justica_eleitoral']]
  ]);

  add('previdenciario', ['Curso', 'Resumo', 'Mapa mental', 'Caderno legislativo'], [
    ['seguridade', 'Seguridade Social', ['saude', 'assistencia', 'previdencia']],
    ['principios', 'Princípios da Seguridade Social', ['principios_constitucionais']],
    ['custeio', 'Custeio e financiamento', ['financiamento_da_seguridade']],
    ['rgps', 'Regime Geral de Previdência Social', ['segurados_do_rgps']],
    ['beneficios', 'Benefícios previdenciários', ['beneficios_do_rgps']],
    ['assistencia', 'Assistência social e benefícios assistenciais', ['bpc']]
  ]);

  add('eca', ['Resumo', 'Mapa mental', 'Caderno legislativo'], [
    ['protecao_integral', 'Proteção integral e direitos fundamentais', ['direitos_fundamentais']],
    ['convivencia', 'Convivência familiar e família substituta', ['familia_substituta']],
    ['medidas_protecao', 'Medidas de proteção', ['medidas_protetivas']],
    ['ato_infracional', 'Ato infracional e medidas socioeducativas', ['medidas_socioeducativas']],
    ['conselho_tutelar', 'Conselho Tutelar e rede de proteção', ['conselho_tutelar']],
    ['trabalho', 'Proteção ao trabalho do adolescente', ['aprendizagem']]
  ]);

  add('consumidor', ['Resumo', 'Mapa mental', 'Caderno legislativo'], [
    ['relacao_consumo', 'Relação de consumo e conceitos fundamentais', ['consumidor', 'fornecedor']],
    ['principios', 'Princípios e direitos básicos do consumidor', ['vulnerabilidade', 'boa_fe']],
    ['responsabilidade', 'Responsabilidade pelo fato e vício', ['fato_do_produto', 'vicio_do_produto']],
    ['praticas', 'Oferta, publicidade e práticas abusivas', ['publicidade', 'praticas_abusivas']],
    ['contratos', 'Contratos e proteção contratual', ['clausulas_abusivas', 'arrependimento']],
    ['defesa', 'Tutela e defesa do consumidor', ['onus_da_prova', 'tutela_coletiva']]
  ]);

  add('financeiro', ['Curso', 'Aula', 'PDF', 'Mapa mental'], [
    ['atividade_financeira', 'Atividade financeira do Estado', ['financas_publicas']],
    ['orcamento', 'Orçamento público', ['ppa', 'ldo', 'loa']],
    ['principios_orcamentarios', 'Princípios orçamentários', ['unidade', 'universalidade', 'anualidade']],
    ['receitas_despesas', 'Receitas e despesas públicas', ['receitas_publicas', 'despesas_publicas']],
    ['creditos', 'Créditos adicionais', ['credito_suplementar', 'credito_especial', 'credito_extraordinario']],
    ['lrf', 'Lei de Responsabilidade Fiscal', ['responsabilidade_fiscal']]
  ]);

  add('humanos', ['Curso', 'Aula', 'PDF', 'Mapa mental'], [
    ['teoria_geral', 'Teoria geral dos Direitos Humanos', ['fontes', 'principios', 'dimensoes']],
    ['sistema_universal', 'Sistema Universal de Direitos Humanos', ['onu']],
    ['sistemas_regionais', 'Sistemas regionais de proteção', ['sistema_interamericano']],
    ['sistema_nacional', 'Proteção dos Direitos Humanos no Brasil', ['sistema_nacional']],
    ['refugiados', 'Refugiados e asilados', ['refugio', 'asilo']],
    ['tratados', 'Tratados internacionais de Direitos Humanos', ['tratados_de_direitos_humanos']]
  ]);
})();
