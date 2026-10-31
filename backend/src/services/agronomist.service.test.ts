import { describe, expect, it } from "bun:test";
import { mapGeminiFailure } from "./agronomist.service";

describe("mapGeminiFailure", () => {
  it("reports Gemini high demand as a temporary error with a retry interval", () => {
    const failure = mapGeminiFailure({
      name: "ApiError",
      status: 503,
      message: JSON.stringify({
        error: {
          code: 503,
          message: "This model is currently experiencing high demand.",
          status: "UNAVAILABLE",
        },
      }),
    });

    expect(failure).toEqual({
      statusCode: 503,
      publicMessage: "Gemini is temporarily unavailable. Please try again shortly.",
      retryAfterSeconds: 5,
    });
  });

  it("does not expose credentials or raw provider errors to users", () => {
    const failure = mapGeminiFailure({
      name: "ApiError",
      status: 403,
      message: "API key=AIza123456789012345678901234567890 is invalid",
    });

    expect(failure.statusCode).toBe(503);
    expect(failure.publicMessage).not.toContain("AIza");
    expect(failure.publicMessage).not.toContain("invalid");
  });

  it("returns a useful retry response for API quota limits", () => {
    const failure = mapGeminiFailure({
      name: "ApiError",
      status: 429,
      message: "RESOURCE_EXHAUSTED",
    });

    expect(failure).toEqual({
      statusCode: 429,
      publicMessage: "Gemini's request limit has been reached. Please wait a moment and try again.",
      retryAfterSeconds: 30,
    });
  });
});
