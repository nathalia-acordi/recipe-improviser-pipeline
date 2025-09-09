import crypto from "node:crypto";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { json, isOptions, routeOf, parseEventBody } from "./shared/utils.mjs";
import { jobsCollection } from "./shared/db.mjs"; 
const sns = new SNSClient({});

export const handler = async (event) => {
  if (isOptions(event)) return json(204, "");

  const { method, path } = routeOf(event);
  if (method === "GET" && path === "/health")
    return json(200, { ok: true, service: "producer" });

  if (!(method === "POST" && path === "/recipe"))
    return json(404, { error: "Rota não encontrada", method, path });

  let body;
  try {
    body = parseEventBody(event);
    if (!body) throw new Error("Body inválido. Envie JSON válido.");
  } catch (e) {
    return json(400, { error: "Body inválido. Envie JSON válido." });
  }

  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients.map(String).map(s => s.trim()).filter(Boolean)
    : [];

  if (!ingredients.length) {
    return json(400, { error: "Forneça 'ingredients' como array de strings." });
  }

  const request = {
    ingredients,
    style: (body.style || "simple").toLowerCase(),
    diet: (body.diet || "none").toLowerCase(),
    servings: Number(body.servings || 2),
  };

  const jobId = new Date().toISOString() + "-" + crypto.randomUUID();
  const topicArn = process.env.TOPIC_ARN;
  if (!topicArn) return json(500, { error: "TOPIC_ARN não configurado" });

  try {
    // 1. Publica no SNS FIFO
    await sns.send(new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify({ jobId, request }),
      MessageGroupId: jobId,
      MessageDeduplicationId: jobId
    }));
    console.log("📤 Publicado no SNS:", jobId);

    // 2. Salva no Mongo com status PENDING
    const collection = await jobsCollection();
    await collection.insertOne({ jobId, status: "PENDING", request });
    console.log("💾 Job inserido no MongoDB com status PENDING:", jobId);

    return json(202, {
      jobId,
      status: "PENDING",
      poll: `/result/${jobId}`
    });
  } catch (err) {
    console.error("❌ Erro ao publicar no SNS ou salvar no Mongo:", err);
    return json(500, {
      error: "Erro ao publicar no SNS ou salvar no banco",
      details: err.message
    });
  }
};
