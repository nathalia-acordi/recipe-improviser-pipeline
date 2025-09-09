import { handler } from "../producer/index.mjs";
import { describe, it, expect } from "vitest";

describe("Producer handler", () => {
  it("deve retornar erro se ingredientes ausentes", async () => {
    const event = { httpMethod: "POST", path: "/recipe", body: "{}" };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/ingredients/i);
  });

  it("deve retornar erro se body for inválido", async () => {
    const event = { httpMethod: "POST", path: "/recipe", body: "{" };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/inválido/i);
  });

  it("deve retornar 404 para rota inexistente", async () => {
    const event = { httpMethod: "GET", path: "/naoexiste" };
    const res = await handler(event);
    expect(res.statusCode).toBe(404);
  });

  it("deve retornar health check", async () => {
    const event = { httpMethod: "GET", path: "/health" };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).service).toBe("producer");
  });
});
