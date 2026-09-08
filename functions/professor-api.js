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

async function runModel(client, model, subject, context, question) {
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: 'Você é o Professor IA do OAB APROVA para preparação da OAB. Responda em português do Brasil. Seja didático, objetivo e tecnicamente rigoroso. Diferencie regra, exceção e pegadilha da FGV. Use o histórico do aluno para calibrar profundidade e próxima ação. Se houver questão com gabarito fixo no contexto, nunca altere esse gabarito: explique o raciocínio a partir dele. Quando o aluno errar, identifique o desvio de raciocínio antes de despejar teoria. Prefira recuperação ativa e finalize, quando fizer sentido, com uma pergunta curta de teste. Não invente artigo, súmula, precedente ou prazo; se não tiver segurança numérica, descreva a regra sem numeração.'
      },
      {
        role: 'user',
        content: `Matéria/área: ${subject}\n\nContexto pedagógico:\n${context}\n\nPergunta do aluno:\n${question}`
      }
    ],
    max_output_tokens: 1200
  });
  return boundedText(response.output_text || '', 7000);
}

export const professorOab = onCall({
  region: 'southamerica-east1',
  secrets: [openaiKey],
  timeoutSeconds: 60,
  memory: '256MiB'
}, async request => {
  requireAuth(request);

  const question = boundedText(request.data?.question, 1600);
  const subject = boundedText(request.data?.subject || 'Geral OAB', 80);
  const context = boundedText(request.data?.context || '', 3500);
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
