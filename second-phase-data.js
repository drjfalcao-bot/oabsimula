window.OAB_SECOND_PHASE = {
  exam: { total: 10, piece: 5, discursives: 5, passing: 6, durationMinutes: 300 },
  areas: [
    {
      id:'administrativo', name:'Direito Administrativo', short:'Administrativo',
      highYield:['Mandado de Segurança','Ação Anulatória / Ordinária','Apelação','Contestação','Ação Popular','Agravo de Instrumento'],
      statutes:['CF/88','Lei 9.784/1999','Lei 14.133/2021','Lei 8.429/1992','Lei 8.987/1995','Lei 12.016/2009','CPC'],
      pieces:[
        'Mandado de Segurança','Ação Anulatória','Ação Ordinária / Obrigação de Fazer','Ação Popular','Ação Civil Pública','Ação Indenizatória','Ação de Desapropriação Indireta','Contestação','Apelação','Agravo de Instrumento','Embargos à Execução','Contrarrazões de Apelação','Recurso Ordinário Constitucional','Ação Rescisória'
      ],
      latest:{exam:46,piece:'Agravo de Instrumento',note:'Decisão interlocutória sobre indisponibilidade de bens em ação de improbidade.'}
    },
    {
      id:'civil', name:'Direito Civil', short:'Civil',
      highYield:['Apelação','Contestação','Petição Inicial','Agravo de Instrumento','Embargos de Terceiro','Embargos à Execução'],
      statutes:['Código Civil','CPC','CDC','Lei 8.009/1990','Lei 6.015/1973','Lei 8.245/1991'],
      pieces:[
        'Petição Inicial pelo Procedimento Comum','Contestação','Reconvenção','Apelação','Agravo de Instrumento','Embargos de Terceiro','Embargos à Execução','Impugnação ao Cumprimento de Sentença','Ação Rescisória','Ação Monitória','Ação de Consignação em Pagamento','Ação de Usucapião','Ação de Alimentos','Ação de Divórcio / Dissolução','Ação de Inventário / Partilha','Ação Possessória','Contrarrazões de Apelação'
      ],
      latest:{exam:46,piece:'Embargos de Terceiro',note:'Bem de sócia atingido em execução contra pessoa jurídica sem regular IDPJ.'}
    },
    {
      id:'constitucional', name:'Direito Constitucional', short:'Constitucional',
      highYield:['Mandado de Segurança','ADI','ADPF','Ação Popular','Mandado de Injunção','Recurso Extraordinário'],
      statutes:['CF/88','Lei 12.016/2009','Lei 9.868/1999','Lei 9.882/1999','Lei 13.300/2016','Lei 4.717/1965','CPC'],
      pieces:[
        'Mandado de Segurança Individual','Mandado de Segurança Coletivo','Ação Direta de Inconstitucionalidade','Ação Declaratória de Constitucionalidade','Arguição de Descumprimento de Preceito Fundamental','Ação Direta de Inconstitucionalidade por Omissão','Mandado de Injunção Individual','Mandado de Injunção Coletivo','Ação Popular','Habeas Data','Reclamação Constitucional','Recurso Extraordinário','Recurso Ordinário Constitucional','Contestação em Ação Constitucional'
      ],
      latest:{exam:46,piece:'Arguição de Descumprimento de Preceito Fundamental',note:'Lei estadual pré-constitucional incompatível com preceitos fundamentais.'}
    },
    {
      id:'trabalho', name:'Direito do Trabalho', short:'Trabalho',
      highYield:['Contestação','Recurso Ordinário','Reclamação Trabalhista','Agravo de Petição','Embargos à Execução'],
      statutes:['CLT','CF/88','CPC subsidiário','Lei 8.036/1990','Lei 605/1949','Súmulas e OJs do TST'],
      pieces:[
        'Reclamação Trabalhista','Contestação Trabalhista','Recurso Ordinário','Agravo de Petição','Embargos à Execução','Impugnação à Sentença de Liquidação','Recurso de Revista','Agravo de Instrumento em Recurso de Revista','Contrarrazões de Recurso Ordinário','Mandado de Segurança','Ação Rescisória','Inquérito para Apuração de Falta Grave','Consignação em Pagamento','Embargos de Terceiro Trabalhistas'
      ],
      latest:{exam:46,piece:'Reclamação Trabalhista',note:'Reconhecimento de vínculo, verbas trabalhistas e indenização.'}
    },
    {
      id:'empresarial', name:'Direito Empresarial', short:'Empresarial',
      highYield:['Petição Inicial','Execução de Título Extrajudicial','Apelação','Contestação','Agravo de Instrumento','Recuperação / Falência'],
      statutes:['Código Civil','CPC','Lei 11.101/2005','Lei 6.404/1976','Lei 9.279/1996','Lei 8.934/1994','Lei 13.966/2019'],
      pieces:[
        'Petição Inicial pelo Procedimento Comum','Execução de Título Extrajudicial','Ação Monitória','Ação de Dissolução Parcial de Sociedade','Ação de Prestação de Contas','Pedido de Falência','Pedido de Recuperação Judicial','Habilitação de Crédito','Impugnação de Crédito','Contestação','Réplica','Apelação','Agravo de Instrumento','Embargos à Execução','Embargos de Terceiro','Cumprimento de Sentença','Contrarrazões','Recurso Especial','Ação de Anulação de Deliberação Societária','Ação Indenizatória Empresarial'
      ],
      latest:{exam:46,piece:'Apelação',note:'Sentença manteve exclusão extrajudicial de sócio; objetivo era reforma na instância superior.'}
    },
    {
      id:'penal', name:'Direito Penal', short:'Penal',
      highYield:['Apelação','Recurso em Sentido Estrito','Resposta à Acusação','Alegações Finais','Queixa-Crime','Revisão Criminal'],
      statutes:['Código Penal','CPP','CF/88','Lei 9.099/1995','Lei 11.340/2006','Lei 11.343/2006','Legislação penal especial'],
      pieces:[
        'Resposta à Acusação','Alegações Finais por Memoriais','Apelação Criminal','Contrarrazões de Apelação','Recurso em Sentido Estrito','Contrarrazões de RESE','Queixa-Crime','Representação Criminal','Relaxamento de Prisão','Liberdade Provisória','Revogação de Prisão Preventiva','Habeas Corpus','Revisão Criminal','Embargos Infringentes e de Nulidade','Agravo em Execução','Recurso Ordinário Constitucional','Pedido de Restituição de Coisa Apreendida'
      ],
      latest:{exam:46,piece:'Resposta à Acusação',note:'Réu citado; defesa precisava atacar inépcia, prova ilícita, justa causa e mérito.'}
    },
    {
      id:'tributario', name:'Direito Tributário', short:'Tributário',
      highYield:['Mandado de Segurança','Apelação','Embargos à Execução Fiscal','Agravo de Instrumento','Repetição de Indébito','Ação Anulatória'],
      statutes:['CF/88','CTN','LEF - Lei 6.830/1980','CPC','LC 116/2003','LC 87/1996','Lei 12.016/2009'],
      pieces:[
        'Mandado de Segurança','Ação Anulatória de Débito Fiscal','Ação Declaratória de Inexistência de Relação Jurídico-Tributária','Ação de Repetição de Indébito','Ação de Consignação em Pagamento','Embargos à Execução Fiscal','Exceção de Pré-Executividade','Apelação','Agravo de Instrumento','Contrarrazões de Apelação','Recurso Ordinário Constitucional','Ação Cautelar / Tutela Antecedente em Matéria Tributária'
      ],
      latest:{exam:46,piece:'Ação Anulatória de Débito Fiscal',note:'Crédito constituído, necessidade de prova testemunhal e tutela de urgência.'}
    }
  ],
  seedCases:[
    {
      id:'adm-seed-01',area:'administrativo',title:'Bloqueio cautelar desproporcional',difficulty:4,
      facts:'Em ação de improbidade, o juiz determinou indisponibilidade de patrimônio do réu por decisão interlocutória. A medida alcançou valor superior ao dano alegado e bens legalmente protegidos. O processo é eletrônico e a defesa pretende suspender imediatamente os efeitos da decisão e submetê-la ao Tribunal.',
      piece:'Agravo de Instrumento',
      cues:['decisão interlocutória','urgência para suspender efeitos','impugnação diretamente ao Tribunal'],
      rubric:[
        ['Identificação da peça e cabimento',0.5],['Endereçamento ao Tribunal',0.3],['Tempestividade/preparo quando aplicável',0.3],['Pedido de efeito suspensivo',0.6],['Fundamentos contra a indisponibilidade',1.8],['Pedidos recursais completos',0.8],['Estrutura e fechamento',0.7]
      ]
    },
    {
      id:'civ-seed-01',area:'civil',title:'Penhora de bem de terceiro',difficulty:3,
      facts:'Uma execução tramita contra uma sociedade. Sem que a sócia tenha integrado regularmente o polo passivo, imóvel residencial de sua propriedade foi penhorado. Ela foi intimada da constrição e quer desconstituí-la no próprio contexto da execução, demonstrando que é terceira e que o bem é impenhorável.',
      piece:'Embargos de Terceiro',
      cues:['bem de quem não integra a execução','ato constritivo','desconstituição da penhora'],
      rubric:[['Peça e legitimidade',0.6],['Distribuição por dependência/endereçamento',0.4],['Tempestividade',0.3],['Prova da qualidade de terceiro e domínio',0.7],['Impenhorabilidade / vício da constrição',1.5],['Tutela para suspender a constrição',0.6],['Pedidos e fechamento',0.9]]
    },
    {
      id:'con-seed-01',area:'constitucional',title:'Norma anterior à Constituição',difficulty:5,
      facts:'Partido político com representação no Congresso quer provocar controle concentrado contra lei estadual editada antes de 1988 que continua produzindo efeitos e viola autonomia federativa e competências constitucionais. Não há outro meio objetivo eficaz para afastar a controvérsia.',
      piece:'Arguição de Descumprimento de Preceito Fundamental',
      cues:['ato normativo pré-constitucional','controle concentrado','subsidiariedade'],
      rubric:[['Peça, competência e legitimidade',0.8],['Cabimento e subsidiariedade',0.8],['Preceitos fundamentais violados',1.5],['Pedido liminar',0.7],['Pedidos de mérito e efeitos',0.7],['Estrutura e fechamento',0.5]]
    },
    {
      id:'tra-seed-01',area:'trabalho',title:'Vínculo sem registro e verbas',difficulty:3,
      facts:'Trabalhadora prestou serviços pessoais, onerosos, habituais e subordinados por quase quatro anos sem registro. Cumpria jornada superior ao limite legal, recebia abaixo do piso normativo e foi dispensada sem quitação. Quer reconhecer o vínculo e cobrar as parcelas decorrentes.',
      piece:'Reclamação Trabalhista',
      cues:['pretensão originária do empregado','reconhecimento de vínculo','pedidos condenatórios trabalhistas'],
      rubric:[['Competência e partes',0.4],['Reconhecimento de vínculo/CTPS',0.9],['Jornada e horas extras',0.7],['Diferenças salariais e reflexos',0.7],['Verbas rescisórias',0.8],['Pedidos líquidos por indicação e justiça gratuita',0.8],['Estrutura e fechamento',0.7]]
    },
    {
      id:'emp-seed-01',area:'empresarial',title:'Exclusão irregular de sócio',difficulty:4,
      facts:'Sócio minoritário ajuizou ação para anular sua exclusão extrajudicial de sociedade limitada. A sentença julgou improcedente o pedido. Não há vícios para embargos de declaração e o cliente quer reforma integral da sentença pelo Tribunal.',
      piece:'Apelação',
      cues:['sentença','reforma na instância superior','sem hipótese de embargos declaratórios'],
      rubric:[['Interposição e endereçamento',0.5],['Tempestividade/preparo',0.4],['Razões recursais',0.5],['Fundamentos societários',1.8],['Efeitos e processamento',0.5],['Pedido de provimento/reforma',0.7],['Estrutura e fechamento',0.6]]
    },
    {
      id:'pen-seed-01',area:'penal',title:'Acusação sem lastro probatório lícito',difficulty:4,
      facts:'Acusado foi citado em ação penal. A denúncia descreve de modo deficiente sua conduta e se apoia em dados extraídos de celular sem autorização judicial. O prazo defensivo está em curso e ainda é possível requerer absolvição sumária e apresentar rol de testemunhas.',
      piece:'Resposta à Acusação',
      cues:['réu já citado','fase anterior à instrução','absolvição sumária e rol de testemunhas'],
      rubric:[['Peça, juízo e prazo',0.6],['Inépcia/justa causa',0.9],['Prova ilícita',0.9],['Tese de absolvição sumária',1.0],['Pedidos',0.8],['Rol de testemunhas',0.3],['Fechamento',0.5]]
    },
    {
      id:'tri-seed-01',area:'tributario',title:'Crédito constituído e cobrança coercitiva',difficulty:4,
      facts:'Empresa recebeu lançamento definitivo de tributo municipal que entende indevido. Para provar onde o serviço foi efetivamente prestado, precisará de prova testemunhal. O Município ainda interditou o estabelecimento como pressão para pagamento. Há urgência para retomar as atividades.',
      piece:'Ação Anulatória de Débito Fiscal',
      cues:['lançamento já constituído','necessidade de dilação probatória','desconstituição do crédito'],
      rubric:[['Peça, competência e partes',0.6],['Cabimento da ação anulatória',0.6],['Fundamentos tributários de mérito',1.5],['Ilegalidade da sanção política',0.6],['Tutela de urgência/suspensão da exigibilidade',0.7],['Pedidos e provas',0.6],['Fechamento',0.4]]
    }
  ]
};
