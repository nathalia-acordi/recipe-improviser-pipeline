import { json, isOptions } from "./shared/utils.mjs";
import { jobsCollection as realJobsCollection } from "./shared/db.mjs";

export const handler = async (event, { jobsCollection: injectedJobsCollection } = {}) => {
  try {
    if (isOptions(event)) return json(204, "");

    const method = event.httpMethod || event.requestContext?.http?.method || "GET";
    const path = event.path || event.rawPath || "/";
    console.log("📡 Request recebida:", { method, path });

    if (method === "GET" && path === "/health") {
      return json(200, { ok: true, service: "reader" });
    }

    if (method === "GET" && path.startsWith("/result/")) {
      const jobId = decodeURIComponent(path.split("/result/")[1] || "").trim();
      console.log("🔎 Buscando jobId:", jobId);

      if (!jobId) return json(400, { error: "Job ID ausente na URL" });

      const collection = await (injectedJobsCollection || realJobsCollection)();
      const job = await collection.findOne({ jobId });

      if (!job) return json(404, { error: "Job ID não encontrado." });

      return json(200, {
        jobId: job.jobId,
        status: job.status,
        result: job.result || null,
      });
    }

    return json(404, { error: "Rota não encontrada" });
  } catch (err) {
    console.error("❌ Erro no Reader:", err);
    return json(500, { error: "Erro interno no reader", details: err.message });
  }
};
