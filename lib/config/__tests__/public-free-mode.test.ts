import { selectModel } from "@/lib/chat/chat-processor";
import { assertFreeAgentGates } from "@/lib/api/chat-stream-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkFreeMonthlyCostLimit } from "@/lib/rate-limit/free-monthly-cost";
import { acquireFreeRunConcurrencyLock } from "@/lib/rate-limit/free-concurrency";

jest.mock("@/lib/db/actions", () => ({
  getNotes: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

describe("PUBLIC_FREE_MODE", () => {
  const original = process.env.PUBLIC_FREE_MODE;

  beforeEach(() => {
    process.env.PUBLIC_FREE_MODE = "true";
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PUBLIC_FREE_MODE;
    } else {
      process.env.PUBLIC_FREE_MODE = original;
    }
  });

  it("routes free Ask and Agent through the OpenRouter free aliases", () => {
    expect(selectModel("ask", "free", "auto")).toBe("ask-model-free");
    expect(selectModel("agent", "free", "auto")).toBe("agent-model-free");
  });

  it("allows a free Agent to use the E2B cloud sandbox", () => {
    expect(() =>
      assertFreeAgentGates({
        mode: "agent",
        subscription: "free",
        sandboxPreference: "e2b",
      }),
    ).not.toThrow();
  });

  it("bypasses app-level free request, monthly, and concurrency limits", async () => {
    const request = await checkRateLimit("public-free-user", "ask", "free");
    expect(request.rateLimitSkipped).toBe(true);

    const monthly = await checkFreeMonthlyCostLimit("public-free-user");
    expect(monthly.rateLimitSkipped).toBe(true);

    const lock = await acquireFreeRunConcurrencyLock("public-free-user");
    expect(lock.rateLimitSkipped).toBe(true);
    await expect(lock.release()).resolves.toBeUndefined();
  });
});
