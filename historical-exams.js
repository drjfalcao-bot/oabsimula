// Índice incremental: adicionar apenas provas realizadas e com gabarito definitivo oficial.
// 47º EOU (Tipo 1): gabarito divulgado pela OAB em 23/09/2026, com Q47 anulada.
export const LATEST_OFFICIAL_EXAM = Object.freeze({
  exam:47, year:2026, examDate:'2026-09-06',
  key:'A B D C C D B B D C C A D C C A D A C B A C A C B B A B D C B C C D C D C A D A D A D B A D * C A D B B C D B D B B D A A C B D D C B B B D A D B A D A B D C A'.split(' '),
  questionPdf:'https://s.oab.org.br/arquivos/2026/09/7d502f11-d906-4378-bd43-27e0c854b981.pdf',
  keyPdf:'https://s.oab.org.br/arquivos/2026/09/572dc8e2-78a0-4e37-b6de-20709e2c59ab.pdf',
  archive:'https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=18197'
});
export const LATEST_SECOND_PHASE = Object.freeze([
  {name:'Administrativo',url:'https://s.oab.org.br/arquivos/2026/11/bb8850ed-7c14-423e-89a9-4532e64c88b6.pdf'},
  {name:'Civil',url:'https://s.oab.org.br/arquivos/2026/11/58d172d3-3275-46fc-82b2-24a52ea2bf2d.pdf'},
  {name:'Constitucional',url:'https://s.oab.org.br/arquivos/2026/11/4b9322a5-c54a-467f-951f-952eab4fd593.pdf'},
  {name:'Trabalho',url:'https://s.oab.org.br/arquivos/2026/11/3d7e2b31-b121-4d55-aa22-7e049c7984bb.pdf'},
  {name:'Empresarial',url:'https://s.oab.org.br/arquivos/2026/11/6e01b711-a766-417e-b6b6-71e0e8713b09.pdf'},
  {name:'Penal',url:'https://s.oab.org.br/arquivos/2026/11/1cf9dfc9-52a0-4c92-986c-227d1d993c49.pdf'},
  {name:'Tributário',url:'https://s.oab.org.br/arquivos/2026/11/91194acd-ccc7-4d44-bec0-014946bec835.pdf'}
]);
if(LATEST_OFFICIAL_EXAM.key.length!==80 || LATEST_OFFICIAL_EXAM.key.filter(x=>x==='*').length!==1 ||
LATEST_OFFICIAL_EXAM.key[46]!=='*') throw new Error('Gabarito 47º inconsistente');
