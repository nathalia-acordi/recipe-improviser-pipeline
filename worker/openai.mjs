function buildSystemPrompt({ style, diet }) {
  const styleDesc = {
    simple: "Instruções curtas, linguagem clara, passos numerados.",
    funny: "Seja muito engraçado. Faça piadas.",
    gourmet: "Toque de chef. Técnicas sofisticadas.",
    chaotic: "Criativo e ousado, mas seguro.",
  }[style] || "Instruções claras e concisas.";

  const dietRules = {
    none: "Sem restrições específicas.",
    vegan: "Sem ingredientes de origem animal.",
    vegetarian: "Sem carnes; ovos e laticínios permitidos.",
    gluten_free: "Sem glúten.",
    lactose_free: "Sem laticínios.",
    low_cost: "Ingredientes acessíveis e econômicos.",
  }[diet] || "Sem restrições específicas.";

  return `Você é um assistente culinário. Gere UMA receita em português, usando apenas os ingredientes listados. Responda ESTRITAMENTE em JSON, sem texto extra.

Formato do JSON:
{
  "title": "string",
  "servings": número,
  "time_minutes": número,
  "ingredients_used": [array de strings],
  "steps": [máx. 4 strings curtas],
  "tips": [máx. 2 strings curtas, opcional],
  "warnings": [máx. 1 string curta, opcional]
}

Estilo: ${styleDesc}
Dieta: ${dietRules}`;
}

function safeParseJsonFromMarkdown(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleaned);
  }
}

export async function callOpenAI({ style, diet, ingredients, servings }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000); 

  const _servings = servings;
  const _ingredients = ingredients;
  try {
    const payload = {
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: buildSystemPrompt({ style, diet }) },
        { role: "user", content: buildUserPrompt({ ingredients: _ingredients, servings: _servings }) },
      ],
      temperature:
        style === "funny" || style === "chaotic" ? 0.9 :
        style === "gourmet" ? 0.7 : 0.4,
      max_tokens: 700,
      response_format: { type: "json_object" }
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "{}";
    console.log("🧪 Resposta bruta do OpenAI:\n", raw);

    return safeParseJsonFromMarkdown(raw);

  } catch (err) {
    console.error("❌ Erro ao fazer parse do JSON gerado:", err.message);
    return {
      title: "Erro ao interpretar receita",
      time_minutes: 0,
      servings: _servings,
      ingredients_used: _ingredients,
      steps: [
        "Houve um erro ao gerar a receita.",
        "Verifique os ingredientes e tente novamente."
      ],
      tips: [],
      warnings: [err.message]
    };
  } finally {
    clearTimeout(t);
  }
}
