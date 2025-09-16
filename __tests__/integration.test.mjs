import { vi } from "vitest";

// Mock do SNSClient e PublishCommand para evitar chamada real ao SNS
vi.mock("@aws-sdk/client-sns", () => ({
  SNSClient: class { send = async () => {}; },
  PublishCommand: class {},
}));
import { describe, it, expect } from "vitest";
import { handler as producerHandler } from "../producer/index.mjs";
import { handler as workerHandler } from "../worker/index.mjs";
import { handler as readerHandler } from "../reader/index.mjs";

// Mock do jobsCollection para simular o MongoDB em memória
const fakeDb = {};
const mockJobsCollection = async () => ({
  insertOne: async (doc) => { fakeDb[doc.jobId] = doc; },
  updateOne: async (filter, update) => {
    if (fakeDb[filter.jobId]) Object.assign(fakeDb[filter.jobId], update.$set);
  },
  findOne: async (filter) => fakeDb[filter.jobId] || null,
});

describe("Integração: fluxo completo producer → worker → reader", () => {
  it("deve criar, processar e consultar um job", async () => {
    process.env.TOPIC_ARN = "arn:aws:sns:sa-east-1:123456789012:fake-topic";
    process.env.OPENAI_API_KEY = "fake-key";
    process.env.SKIP_OPENAI = "1";
    // 1. Producer cria o job
    const event = {
      httpMethod: "POST",
      path: "/recipe",
      body: JSON.stringify({
        ingredients: ["arroz", "feijão"],
        style: "simple",
        diet: "none",
        servings: 2,
      }),
    };
    const prodRes = await producerHandler(event, { jobsCollection: mockJobsCollection });
    const prodBody = JSON.parse(prodRes.body);
    const jobId = prodBody.jobId;
    // Recupera o request salvo no banco simulado
    const jobDoc = fakeDb[jobId];
    const request = jobDoc.request;

    // 2. Worker processa o job
    const fakeSnsEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({ jobId, request }),
          }),
          attributes: { ApproximateReceiveCount: "1" },
        },
      ],
    };
    await workerHandler(fakeSnsEvent, { jobsCollection: mockJobsCollection });

    // 3. Reader consulta o resultado
    const readEvent = { httpMethod: "GET", path: `/result/${jobId}` };
    const readRes = await readerHandler(readEvent, { jobsCollection: mockJobsCollection });
    const result = JSON.parse(readRes.body);

    expect(result.jobId).toBe(jobId);
    expect(["DONE", "PENDING"]).toContain(result.status); // PENDING se mock, DONE se worker rodou
    expect(result.result).toBeDefined();
  });
});
