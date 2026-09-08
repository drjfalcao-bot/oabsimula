const OLD_COMMANDS = [
  'À luz do direito brasileiro vigente, assinale a alternativa correta.',
  'Considerando a disciplina jurídica aplicável, qual solução está correta?',
  'A respeito da consequência jurídica do caso, assinale a opção correta.',
  'Segundo o regime legal aplicável à situação narrada, é correto afirmar que:',
  'Como deve ser resolvida juridicamente a situação?'
];

const OLD_LEADS = [
  /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+ procura orientação jurídica porque\s+/u,
  /^Em caso submetido à análise profissional, verifica-se que\s+/i,
  /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+, diante de situação concreta, relata o seguinte:\s+/u,
  /^Considere a seguinte situação prática:\s+/i,
  /^Em prova de aplicação normativa, toma-se como premissa que\s+/i
];

const STARTER_FIXES = [
  [/^Agente\b/, 'Um agente'],
  [/^Pessoa\b/, 'Uma pessoa'],
  [/^Profissional\b/, 'Um profissional'],
  [/^Médico\b/, 'Um médico'],
  [/^Produtor rural\b/, 'Um produtor rural'],
  [/^Empresa\b/, 'Uma empresa'],
  [/^Empresário\b/, 'Um empresário'],
  [/^Sociedade\b/, 'Uma sociedade'],
  [/^Advogado\b/, 'Um advogado'],
  [/^Advogada\b/, 'Uma advogada'],
  [/^Réu\b/, 'O réu'],
  [/^Autor\b/, 'O autor'],
  [/^Juiz\b/, 'O juiz'],
  [/^Órgão público\b/, 'Um órgão público'],
  [/^Órgão\b/, 'Um órgão'],
  [/^Defensor\b/, 'O defensor'],
  [/^Acusação\b/, 'A acusação'],
  [/^Acusado\b/, 'O acusado'],
  [/^Devedor\b/, 'O devedor'],
  [/^Credor\b/, 'O credor'],
  [/^Sócios\b/, 'Os sócios'],
  [/^Trabalhador\b/, 'Um trabalhador'],
  [/^Empregado\b/, 'Um empregado'],
  [/^Empregador\b/, 'Um empregador'],
  [/^Consumidor\b/, 'Um consumidor'],
  [/^Fornecedor\b/, 'Um fornecedor']
];

const COMMANDS = [
  'Considerando a situação descrita, assinale a alternativa correta.',
  'À luz da legislação aplicável, assinale a afirmativa correta.',
  'Com base no ordenamento jurídico, assinale a opção correta.',
  'Sobre a consequência jurídica dessa situação, assinale a alternativa correta.',
  'Assinale a afirmativa que apresenta a solução juridicamente adequada.'
];

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripOldCommand(text) {
  let out = normalizeSpaces(text);
  for (const command of OLD_COMMANDS) {
    if (out.endsWith(command)) {
      out = out.slice(0, -command.length).trim();
      break;
    }
  }
  return out;
}

function stripOldLead(text) {
  let out = normalizeSpaces(text);
  for (const pattern of OLD_LEADS) {
    if (pattern.test(out)) {
      out = out.replace(pattern, '');
      break;
    }
  }
  return out;
}

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function naturalizeStarter(text) {
  let out = capitalizeFirst(normalizeSpaces(text));
  for (const [pattern, replacement] of STARTER_FIXES) {
    if (pattern.test(out)) {
      out = out.replace(pattern, replacement);
      break;
    }
  }
  return out;
}

function ensureTerminalPunctuation(text) {
  const out = normalizeSpaces(text);
  if (!out) return out;
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

function variantFromId(id) {
  const match = String(id || '').match(/-v([1-5])$/i);
  return match ? Number(match[1]) - 1 : 0;
}

export function polishEditorialQuestion(question) {
  if (!question || question.origin !== 'editorial-grounded') return question;

  let fact = stripOldCommand(question.text);
  fact = stripOldLead(fact);
  fact = naturalizeStarter(fact);
  fact = ensureTerminalPunctuation(fact);

  const variant = variantFromId(question.id);
  const command = COMMANDS[variant] || COMMANDS[0];

  return {
    ...question,
    text: `${fact} ${command}`,
    copyEdited: true,
    copyVersion: 2
  };
}

export function polishEditorialQuestions(questions) {
  return Array.isArray(questions) ? questions.map(polishEditorialQuestion) : [];
}

export function questionReadabilityIssues(question) {
  const text = normalizeSpaces(question?.text);
  const issues = [];
  if (!text) return ['enunciado_vazio'];
  if (/Em prova de aplicação normativa/i.test(text)) issues.push('linguagem_meta_prova');
  if (/procura orientação jurídica porque\s+(uma|um|o|a)\s+/i.test(text)) issues.push('encaixe_artificial');
  if (/diante de situação concreta, relata o seguinte/i.test(text)) issues.push('moldura_artificial');
  if (/Em caso submetido à análise profissional/i.test(text)) issues.push('moldura_artificial');
  if (text.length > 780) issues.push('enunciado_longo');
  if (!/[.!?]\s+(Considerando|À luz|Com base|Sobre|Assinale)/.test(text)) issues.push('comando_pouco_destacado');
  return issues;
}
