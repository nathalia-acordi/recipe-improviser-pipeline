import { callOpenAI } from "./openai.mjs";
import { jobsCollection as realJobsCollection } from "./shared/db.mjs";

export const handler = async (event, { jobsCollection: injectedJobsCollection } = {}) => {
  const collection = await (injectedJobsCollection || realJobsCollection)();

  for (const record of event.Records || []) {
    const tries = Number(record.attributes?.ApproximateReceiveCount || "1");
    const jobStart = Date.now();

    try {
      const snsMessage = JSON.parse(record.body || "{}");
      console.log("📩 Mensagem recebida:", snsMessage);
      const { jobId, request } = JSON.parse(snsMessage.Message || "{}");

      if (!jobId || !request) {
        console.error("❌ jobId ou request ausentes:", snsMessage);
        continue;
      }

      console.log("📡 Chamando OpenAI com request:", request);

      const openaiStart = Date.now();
      const result =
        process.env.SKIP_OPENAI === "1"
          ? { title: "Mock", steps: ["Passo 1", "Passo 2"] }
          : await callOpenAI(request);
      const openaiEnd = Date.now();

      const mongoStart = Date.now();
      await collection.updateOne(
        { jobId },
        { $set: { status: "DONE", result } }
      );
      const mongoEnd = Date.now();

      const openai_ms = openaiEnd - openaiStart;
      const mongo_ms = mongoEnd - mongoStart;
      const total_ms = Date.now() - jobStart;

      console.log("✅ Job processado e atualizado:", jobId);
      console.log("timings:", JSON.stringify({ jobId, openai_ms, mongo_ms, total_ms }));
    } catch (err) {
      console.error("❌ Erro ao processar job:", { tries, err: err?.message });
      // sem DLQ? não rethrow depois de N tentativas para não envenenar a fila
      if (tries >= 5) {
        console.warn("Descartando mensagem após 5 tentativas");
        continue;
      }
      throw err;
    }
  }
};