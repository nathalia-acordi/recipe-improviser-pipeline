import { describe, it, expect, vi } from "vitest";
import { handler } from "../worker/index.mjs";

describe("Worker handler", () => {
  const mockJobsCollection = async () => ({ updateOne: vi.fn() });

  it("deve ignorar eventos sem Records", async () => {
    const res = await handler({}, { jobsCollection: mockJobsCollection });
    expect(res).toBeUndefined();
  });

  it("deve ignorar job sem jobId ou request", async () => {
    const event = { Records: [{ body: JSON.stringify({ Message: JSON.stringify({}) }) }] };
    const res = await handler(event, { jobsCollection: mockJobsCollection });
    expect(res).toBeUndefined();
  });

  it("deve descartar após 5 tentativas", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({ Message: JSON.stringify({ jobId: "id", request: {} }) }),
          attributes: { ApproximateReceiveCount: "5" }
        }
      ]
    };
    const res = await handler(event, { jobsCollection: mockJobsCollection });
    expect(res).toBeUndefined();
  });
});
