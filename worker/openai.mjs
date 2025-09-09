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

  return `Você é um assistente CULINÁRIO em PT-BR.
- Estilo: ${styleDesc}
- Dieta/Restrição: ${dietRules}
- IMPORTANTE: responda ESTRITAMENTE em JSON, sem nenhum texto antes ou depois.
- O JSON deve conter as chaves: title, servings, time_minutes, ingredients_used, steps, tips, warnings.`;
}

function buildUserPrompt({ ingredients, servings }) {
  return `Ingredientes disponíveis: ${ingredients.join(", ")}
Porções: ${servings || 2}
Gere UMA receita de 20-30 min com 4 a 8 passos.`;
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

  try {
    const payload = {
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: buildSystemPrompt({ style, diet }) },
        { role: "user", content: buildUserPrompt({ ingredients, servings }) },
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
      servings,
      ingredients_used: ingredients,
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
