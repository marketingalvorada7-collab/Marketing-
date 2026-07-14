const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const EXTRACT_PROMPT =
  'Este e um boleto bancario brasileiro. Extraia o valor total (em reais) e a data de vencimento. ' +
  'Responda SOMENTE com um JSON no formato exato, sem markdown e sem texto adicional: ' +
  '{"valor": 400.00, "vencimento": "2026-07-20"}. ' +
  "Se nao conseguir identificar algum dado com certeza, use null nesse campo.";

exports.extractBoleto = onCall({ secrets: [ANTHROPIC_API_KEY], cors: true }, async (request) => {
  const { base64, mimeType } = request.data || {};
  if (!base64 || !mimeType) {
    throw new HttpsError("invalid-argument", "Arquivo ausente ou inválido.");
  }

  const contentBlock =
    mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
              ? mimeType
              : "image/jpeg",
            data: base64,
          },
        };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY.value(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: EXTRACT_PROMPT }] }],
    }),
  });

  if (!response.ok) {
    throw new HttpsError("internal", `Anthropic API respondeu ${response.status}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) return { valor: null, vencimento: null, ok: false };

  const clean = textBlock.text.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    return { valor: null, vencimento: null, ok: false };
  }

  const valor = typeof parsed.valor === "number" ? parsed.valor : null;
  const vencimento =
    typeof parsed.vencimento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.vencimento)
      ? parsed.vencimento
      : null;
  return { valor, vencimento, ok: true };
});
