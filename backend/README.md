# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## AI Agronomist

The authenticated chat endpoint uses Google's official `@google/genai` SDK. Configure these variables in the backend environment (never in a `NEXT_PUBLIC_*` variable):

```env
GEMINI_API_KEY=your-google-ai-studio-api-key
GEMINI_MODEL=gemini-3.6-flash
```

`GEMINI_MODEL` is optional; the default is the stable `gemini-3.6-flash`. This model was verified with a live response using the configured backend key. Google may change model availability and free-tier quotas; check the [Gemini API model catalog](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing) for current availability and limits.

After setting the backend variables, restart the backend. Authenticated endpoints are `GET /api/user/agronomist/status` (returns `{ "available": true }`) and `POST /api/user/agronomist/chat`. Chat accepts `{ "messages": [{ "role": "user" | "assistant", "content": "..." }] }`, with a maximum of 20 alternating messages and 4,000 characters per message. It returns `{ "reply": "...", "model": "...", "contextStatus": "available" | "empty" | "unavailable", "createdAt": "..." }`. Requests are limited to 10 per minute per user in each backend process. Chat history is held in the browser session and is not persisted by the backend.
