(() => {
  'use strict';

  const folder = (id, label, source, kind, note = '') => ({ id, label, source, kind, note });

  window.OAB_DRIVE_CATALOG = {
    version: 1,
    lastScan: '2026-09-14',
    backupRoot: '1fMjnsQZn7ZLpN1X3AezP3ekb3AKwrVRN',
    sources: {
      ceisc: { name: 'CEISC Extensivo Premium 48', root: '1aNbWAQsQ3_CdXZQFCtkKb6mxPrNWdGCb' },
      vde: { name: 'VDE 120 Dias — Exame 48', root: '1rPZSrCuSSCvi4x8t8y38I_et6i_dg4v_' }
    },
    collections: [
      folder('1gqJExxK1-ZXuRAJ_bBgk454UYvSn5vNQ', 'Bateria de Questões', 'CEISC', 'questoes', 'Treino em volume'),
      folder('11vv29E-QD8O04D9SiE5yxNz17p-LlXiZ', 'Simulados', 'CEISC', 'simulados', 'Aplicação e tempo de prova'),
      folder('1GB5SARdt5sHwO_cxaZu2B8Va8n4Wk7_8', 'Checkpoint — revisão guiada', 'CEISC', 'revisao', 'Consolidação e revisão'),
      folder('1wQerlac_9zHf4BRiQ1YytGZ2TzShw7Q2', 'Mentorias', 'CEISC', 'mentoria', 'Orientação de estudo'),
      folder('1qvXWPqdva-CWrUjzZ1IuQ84MDR2WxfUr', 'Simulados', 'VDE', 'simulados', 'Simulados do VDE'),
      folder('1MNQURIM6O_AfkOPdYs1vMjQmrS4u4YuS', 'Revisão', 'VDE', 'revisao', 'Revisões do ciclo de 120 dias'),
      folder('1nyVKdaOe0vCa2FSCG22uZTNbEq8pEhBW', 'Cronograma 120 dias', 'VDE', 'cronograma', 'Planejamento do VDE'),
      folder('12D1ClXrSpM7vQN0Wq3dNVRS6fxcNmPPn', 'Cronograma de estudos', 'CEISC', 'cronograma', 'Planejamento do CEISC')
    ],
    subjects: {
      etica: {
        name: 'Ética Profissional',
        resources: [
          folder('1zggrCHwAWbXX8VRddDo1cEeLZ0eQ1Lxn', 'Curso CEISC', 'CEISC', 'curso'),
          folder('18GjYztsm0Enm585qGXL30JGjOMTODouB', 'Resumos', 'VDE', 'resumo'),
          folder('11tqFSovq0N9sovbEJ3I08gbBm6o9rkjY', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1nT2QHQr25NHXdnsMsnEx2_gECnF8GuKU', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      constitucional: {
        name: 'Direito Constitucional',
        resources: [
          folder('1Kb40-5LKaSe6Nm0gNzQOoRFYJvCeywQZ', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1MYzjaLyPJ2NDyWJFrI3KxxS0ukSRozAl', 'Aulas teóricas', 'VDE', 'aula'),
          folder('1ge6wc7MHZT2_G8s-zhBqpAIP4E8wYCGb', 'Resumos', 'VDE', 'resumo'),
          folder('1aBdqfADDKgYjbh_6RWDXjk-etMWc7Qsl', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1_CR1R0EoxbvfhYDbuvpMdlE54Ee1otkb', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      penal: {
        name: 'Direito Penal',
        resources: [
          folder('1vcxzJl33UdtuN3gUAUEXF4nnLM6Y6t_p', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1TCfAIKW4MpG84zIoIWeWVyFhEbRUm5lE', 'Aulas teóricas', 'VDE', 'aula'),
          folder('1Xhrp4WnyARW3x4qG8OQRGTNbDj92yBcC', 'Resumos', 'VDE', 'resumo'),
          folder('1CMwNzwsz4zxAXEjVyHgjQMjXj6_poK0a', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1iWxBE2GLB5huFXMCSMpHrDoMuGsvyjED', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      'processo-penal': {
        name: 'Processo Penal',
        resources: [
          folder('1Vaekb_CPAA5clvUZmIbt6HcgWbW0gayN', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1D058aHvPfOpIc2OZPP6fXTLYvCSr1Ejo', 'Resumos', 'VDE', 'resumo'),
          folder('18SdsJArqxX5D41wkKOAIEvXrZtM370Pr', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1doD8fTxFxAZUn6Sz13tqvoKNlNrj3JWC', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      tributario: {
        name: 'Direito Tributário',
        resources: [
          folder('1gsD3dlCEgb6XDzagj4eJYuTOrAa-vTOQ', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1_ZqHc1xDWW8PQl2_BSJdE4QNSufV6kRe', 'Aulas teóricas', 'VDE', 'aula'),
          folder('14DmMk18OHCl6sWbloMnlfTyYmvV1ENyF', 'Resumos', 'VDE', 'resumo'),
          folder('1r_kd7TP3oo-lwOyOpH8iaLshV09ISmqx', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1kYYn0BMgJI_-jHzfbUl5eKwz4KLelAUm', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      trabalho: {
        name: 'Direito do Trabalho',
        resources: [
          folder('1QcoigD_ZflMvNLnV9fMmOeH_RPErVHKo', 'Curso CEISC', 'CEISC', 'curso'),
          folder('16RWhfl__qKYtPL_K5NNlRcRbG3y0xH-F', 'Aulas teóricas', 'VDE', 'aula'),
          folder('1uCsxM6zcTnU-VykNkJaRjccjPQjpMIgz', 'Resumos', 'VDE', 'resumo'),
          folder('1BO4F3n9smmhpiGzZVHqmMODsoo7ZIlik', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1JL65Yc4HogyBni7tdd57hQkq5fMpdGUN', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      'processo-trabalho': {
        name: 'Processo do Trabalho',
        resources: [
          folder('1Z--8_wdCXfQR2wtMu5JREuLijUdzw89M', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1CswGo7lB6Hn1vJjw2xq7y3w0or7cbo8F', 'Aulas teóricas', 'VDE', 'aula'),
          folder('1roS4EkF2BqRG98xJkQ_hOh0iltVrhoTk', 'Resumos', 'VDE', 'resumo'),
          folder('1Th0Y0-8EcOElKeJ2uMOQ7fhNAW9l88oZ', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1wfQlSS_9EwsrqQiy6YvZ6Cl3aAwPvtiM', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      civil: {
        name: 'Direito Civil',
        resources: [
          folder('1seZBGDcygVpOMajsEsDXHph7yW7hFAwm', 'Curso CEISC', 'CEISC', 'curso'),
          folder('15w3LqmCN1pjIob6_a6F1ycKd2VSu7kq4', 'Aulas teóricas', 'VDE', 'aula'),
          folder('111ZZ_Mr23vPwRLHLeucGZZyOlOeEQrm6', 'Resumos', 'VDE', 'resumo'),
          folder('1mTwW0JRK42UM1UuJ_PLNj6T3MtaKSBu4', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1L0ktlE4iFxZQm8QiYQKGPv53WYmxFAFp', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      'processo-civil': {
        name: 'Processo Civil',
        resources: [
          folder('1xoo1EvALJVpdS9ddlT1aba3vKN2NwKrD', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1h-gxEWk0OfsPuGPElYypgkS3JSnvytwK', 'Resumos', 'VDE', 'resumo'),
          folder('1OsjhGfISJdWXWpaYUM35T4yKGIkHn0Zw', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      administrativo: {
        name: 'Direito Administrativo',
        resources: [
          folder('14YC1A3Une_hDi9MRpQHVJAoubR1aaR31', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1Jihr2yH9bNJNqS7s5kw1cU0s8brFOloQ', 'Resumos', 'VDE', 'resumo'),
          folder('14v-_QxUeY4yLAMZgbWsCAbXtHl09pxJG', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      empresarial: {
        name: 'Direito Empresarial',
        resources: [
          folder('1EriKe3UOfeesBQcHGZnSxdmGj5C0wwWa', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1zNXC7oqcOBDqW7gL0xtGori-0-BVme4D', 'Resumos', 'VDE', 'resumo'),
          folder('1YZHyca6QWGeYrVFHBgfS1e5P7Y802lZM', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1Rt806ex_HX-S652oP2aPomt1NCDriWcN', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      eleitoral: {
        name: 'Direito Eleitoral',
        resources: [
          folder('1CqmhsZ6qH4IVLIrzczdS9dq0tHew-WI3', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1DhF5zT1mAo-nut-wRBJJJ6UG1pmkSL-B', 'Resumos', 'VDE', 'resumo'),
          folder('1u4F0XHUx5xwDLZKek9ZIRAcyWHyPJwrT', 'Mapas mentais', 'VDE', 'mapa'),
          folder('15zfDGEWN5TciXxrxz0nZSDRoKrk1bn1X', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      financeiro: {
        name: 'Direito Financeiro',
        resources: [
          folder('1qiPDOI8BrjYUsYAF_vMOqYFnI1R-ZbI7', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1dN-CJ6tLsvIA1uSb--RFFWhrK_Gvn8kC', 'Aulas teóricas', 'CEISC', 'aula'),
          folder('1nsONP8zVaycea5WhIAmE_IbJOFaEOVTg', 'Apostila e mapa mental', 'CEISC', 'pdf')
        ]
      },
      previdenciario: {
        name: 'Direito Previdenciário',
        resources: [
          folder('13GnLrqqOOsVePMB4xBqYu4dL2ySXmYAy', 'Curso CEISC', 'CEISC', 'curso'),
          folder('19Kxti_P2PjjTG9T6dm3_qUyJ3GVeSfkP', 'Resumos', 'VDE', 'resumo'),
          folder('1evCXGeR9EkqqW6TLb3yelYh97hgufy0e', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1X04uah1-c-2x0Bx1ciVrBhjhPLHuIDuc', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      humanos: {
        name: 'Direitos Humanos',
        resources: [
          folder('1klZb0EE5LircioBlYjb1DwcS5zq2rpTL', 'Curso CEISC', 'CEISC', 'curso'),
          folder('1RRkfpdb9t5hZm8Mo9z_cIzE9GgfZnZ2c', 'Aulas teóricas', 'CEISC', 'aula'),
          folder('1YOMPXVUcQeNEYrAgF2cFiv58kUXULNl0', 'Apostila e mapa mental', 'CEISC', 'pdf')
        ]
      },
      eca: {
        name: 'ECA',
        resources: [
          folder('1BYmsbeSziOuR8ESpxwZdGs0iwNPP-VTB', 'Resumos', 'VDE', 'resumo'),
          folder('11R627yHibiNexwUPY2CWnyMbWKpiU5NQ', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1usX1OrkL-Q7QwJiLH5CFn8eh8MU4-ZO6', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      consumidor: {
        name: 'Direito do Consumidor',
        resources: [
          folder('1yF9TTVthp0yVFiPWSTAuUblw_IC_n8OC', 'Resumos', 'VDE', 'resumo'),
          folder('1REKJvnZnUFef1y9rQCu8jrjMlD7e5gCw', 'Mapas mentais', 'VDE', 'mapa'),
          folder('1tT4XF9IlGgfyTSZSnJc9JCBaxJ02ogkj', 'Caderno legislativo', 'VDE', 'legislacao')
        ]
      },
      ambiental: { name: 'Direito Ambiental', resources: [folder('1DSCyD1riojezakflHtEONUDF5dmKUEEB', 'Acervo', 'Drive', 'acervo')] },
      internacional: { name: 'Direito Internacional', resources: [folder('1FrPblXlznLaht2rqvG1QyC55ZltRmlxj', 'Acervo', 'Drive', 'acervo')] },
      filosofia: { name: 'Filosofia do Direito', resources: [folder('1m5G-g-MG8YCF3Ki9CFiTpwR6vcSZ6H7A', 'Acervo', 'Drive', 'acervo')] }
    }
  };
})();
