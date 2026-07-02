import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";

initializeApp();

const openaiKey = defineSecret("OPENAI_API_KEY");

export const tutorOab = onCall({ region: "southamerica-east1", secrets: [openaiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre com Google para usar o tutor.");
  }

  const question = String(request.data?.question || "").trim();
  const subject = String(request.data?.subject || "Geral").slice(0, 80);
  const context = String(request.data?.context || "").slice(0, 2500);

  if (!question || question.length < 3) {
    throw new HttpsError("invalid-argument", "Pergunta vazia.");
  }
  if (question.length > 1200) {
    throw new HttpsError("invalid-argument", "Pergunta muito longa.");
  }

  const client = new OpenAI({ apiKey: openaiKey.value() });

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "Você é um tutor objetivo para a 1ª fase da OAB. Responda em português do Brasil. Explique o raciocínio jurídico de forma curta, use tópicos quando útil, não invente jurisprudência ou artigos. Quando não tiver certeza, diga que precisa conferir a fonte oficial. Não dê aconselhamento jurídico individualizado."
      },
      {
        role: "user",
        content: `Matéria: ${subject}\nContexto de estudo: ${context}\nPergunta do aluno: ${question}`
      }
    ],
    max_output_tokens: 700
  });

  return { answer: response.output_text || "Não consegui gerar resposta." };
});
