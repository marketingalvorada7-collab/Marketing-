const EXTRACT_PROMPT =
  'Este e um boleto bancario brasileiro. Extraia o valor total (em reais) e a data de vencimento. ' +
  'Responda SOMENTE com um JSON no formato exato, sem markdown e sem texto adicional: ' +
  '{"valor": 400.00, "vencimento": "2026-07-20"}. ' +
  "Se nao conseguir identificar algum dado com certeza, use null nesse campo.";

const EMPTY_RESULT = { valor: null, vencimento: null, ok: false };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido." }) };
  }

  const { base64, mimeType } = body;
  if (!base64 || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Arquivo ausente ou inválido." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 200, body: JSON.stringify(EMPTY_RESULT) };
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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: EXTRACT_PROMPT }] }],
      }),
    });

    if (!response.ok) {
      return { statusCode: 200, body: JSON.stringify(EMPTY_RESULT) };
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return { statusCode: 200, body: JSON.stringify(EMPTY_RESULT) };
    }

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      return { statusCode: 200, body: JSON.stringify(EMPTY_RESULT) };
    }

    const valor = typeof parsed.valor === "number" ? parsed.valor : null;
    const vencimento =
      typeof parsed.vencimento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.vencimento)
        ? parsed.vencimento
        : null;

    return { statusCode: 200, body: JSON.stringify({ valor, vencimento, ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 200, body: JSON.stringify(EMPTY_RESULT) };
  }
};
