import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

const openaiKey = defineSecret('OPENAI_API_KEY');
const PRIMARY_MODEL = 'gpt-5.6-luna';
const FALLBACK_MODEL = 'gpt-4.1-mini';

function boundedText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre com Google para usar o Professor IA.');
}

function errorCode(error) {
  return String(error?.code || error?.error?.code || '').toLowerCase();
}

function errorStatus(error) {
  return Number(error?.status || error?.statusCode || error?.response?.status || 0);
}

function canFallbackModel(error) {
  const status = errorStatus(error);
  const code = errorCode(error);
  const message = String(error?.message || '').toLowerCase();
  return status === 400 || status === 404 || code.includes('model_not_found') || message.includes('model') && (message.includes('not found') || message.includes('access'));
}

function mapOpenAIError(error) {
  const status = errorStatus(error);
  const code = errorCode(error);

  if (status === 401 || code.includes('invalid_api_key')) {
    return new HttpsError('failed-precondition', 'A credencial do Professor IA precisa ser atualizada.', { reason: 'openai_auth' });
  }
  if (status === 429 || code.includes('rate_limit') || code.includes('insufficient_quota')) {
    return new HttpsError('resource-exhausted', 'O Professor IA atingiu o limite temporário de uso. Tente novamente em instantes.', { reason: 'openai_quota' });
  }
  if (status >= 500) {
    return new HttpsError('unavailable', 'O provedor de IA está temporariamente indisponível. Tente novamente.', { reason: 'openai_upstream' });
  }
  return new HttpsError('internal', 'Falha no backend do Professor IA.', { reason: 'openai_request_failed' });
}

const PROFESSOR_SYSTEM = `Você é o Professor IA do OAB APROVA, especializado na 1ª fase do Exame de Ordem e no padrão decisório da FGV.

OBJETIVO: aumentar pontos na prova, não produzir aulas enciclopédicas. Ensine o aluno a reconhecer o fato juridicamente decisivo, recuperar a regra correta sob pressão e eliminar distratores plausíveis.

PROTOCOLO DE RACIOCÍNIO OAB/FGV:
1. DIAGNÓSTICO: identifique em 1 frase o instituto e o detalhe fático que decide a questão.
2. REGRA: exponha a regra operacional mínima para acertar, separando regra geral, requisito e exceção.
3. APLICAÇÃO: conecte explicitamente cada fato relevante do enunciado ao efeito jurídico. Não pule da lei para a resposta.
4. DISTRATORES: quando houver alternativas, explique o erro jurídico específico das incorretas — competência, legitimidade, prazo, requisito, exceção, efeito ou instituto confundido. Não diga apenas “está errada”.
5. MEMÓRIA: formule uma regra curta de recuperação (“se X, então Y; exceto Z”), sem mnemônico inventado.
6. TESTE: finalize, quando útil, com uma pergunta curta que obrigue o aluno a recuperar a regra sem reler.

CALIBRAÇÃO PEDAGÓGICA:
- Se o histórico indicar erro por desconhecimento, faça teoria cirúrgica e um teste de aplicação.
- Se indicar confusão, contraste os dois institutos lado a lado e destaque o discriminador.
- Se indicar leitura/atenção, mostre a palavra/fato que mudou o gabarito e proponha técnica de leitura, sem aumentar teoria.
- Se o tema já estiver dominado, seja breve e foque manutenção/velocidade.
- Se o contexto trouxer prioridade temática, incidência histórica ou cobertura diagnóstica, use isso para justificar a próxima ação, mas nunca trate incidência passada como previsão certa da próxima prova.

REGRAS DE INTEGRIDADE:
- Responda em português do Brasil, com precisão técnica e vocabulário jurídico adequado à OAB.
- Se houver gabarito fixo/oficial no contexto, jamais o altere; explique a partir dele. Se detectar aparente inconsistência, sinalize-a sem inventar novo gabarito.
- Não invente artigo, súmula, precedente, prazo, quórum ou número. Se não houver segurança, explique a regra sem número e diga o que precisa de conferência oficial.
- Diferencie texto legal, entendimento consolidado e estratégia estatística de prova. Não transforme frequência histórica em regra jurídica.
- Evite longas introduções, motivação genérica e repetição. A resposta deve produzir uma decisão de estudo ou uma regra recuperável.`;

async function runModel(client, model, subject, context, question) {
  const response = await client.responses.create({
    model,
    input: [
      { role: 'system', content: PROFESSOR_SYSTEM },
      {
        role: 'user',
        content: `Alvo: 48º Exame de Ordem Unificado, 1ª fase em 10/01/2027. A estratégia de distribuição por disciplina é provisória até o edital do 48º; não apresente essa distribuição como regra oficial definitiva.\n\nMatéria/área: ${subject}\n\nContexto pedagógico do aluno:\n${context}\n\nPergunta do aluno:\n${question}`
      }
    ],
    max_output_tokens: 1400
  });
  return boundedText(response.output_text || '', 8000);
}

export const professorOab = onCall({
  region: 'southamerica-east1',
  secrets: [openaiKey],
  timeoutSeconds: 60,
  memory: '256MiB'
}, async request => {
  requireAuth(request);

  const question = boundedText(request.data?.question, 1800);
  const subject = boundedText(request.data?.subject || 'Geral OAB', 100);
  const context = boundedText(request.data?.context || '', 5000);
  if (question.length < 2) throw new HttpsError('invalid-argument', 'Escreva uma pergunta para o Professor IA.');

  const apiKey = openaiKey.value();
  if (!apiKey) {
    console.error('professorOab: OPENAI_API_KEY ausente no runtime');
    throw new HttpsError('failed-precondition', 'A credencial do Professor IA ainda não está configurada.', { reason: 'missing_openai_secret' });
  }

  const client = new OpenAI({ apiKey });
  let lastError = null;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const answer = await runModel(client, model, subject, context, question);
      if (!answer) throw new Error('empty_model_response');
      return { answer, model };
    } catch (error) {
      lastError = error;
      console.error('professorOab model failure', {
        model,
        status: errorStatus(error),
        code: errorCode(error),
        message: boundedText(error?.message || error, 500)
      });
      if (model === PRIMARY_MODEL && canFallbackModel(error)) continue;
      break;
    }
  }

  throw mapOpenAIError(lastError);
});
