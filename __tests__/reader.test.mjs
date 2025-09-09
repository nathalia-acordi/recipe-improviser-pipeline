import { describe, it, expect } from "vitest";
import { handler } from "../reader/index.mjs";

describe("Reader handler", () => {
  it("deve retornar health check", async () => {
    const event = { httpMethod: "GET", path: "/health" };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).service).toBe("reader");
  });

  it("deve retornar erro para rota inexistente", async () => {
    const event = { httpMethod: "GET", path: "/naoexiste" };
    const res = await handler(event);
    expect(res.statusCode).toBe(404);
  });

  it("deve retornar erro se jobId ausente na URL", async () => {
    const event = { httpMethod: "GET", path: "/result/" };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/ausente/i);
  });

  it("deve retornar erro se jobId não encontrado", async () => {
    const mockJobsCollection = async () => ({ findOne: async () => null });
    const event = { httpMethod: "GET", path: "/result/naoexiste" };
    const res = await handler(event, { jobsCollection: mockJobsCollection });
    expect(res.statusCode).toBe(404);
  });
});
