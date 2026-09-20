import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// One-shot sound-effect generator. Called once per asset during development;
// the resulting MP3s are saved as static files under public/audio/ and the
// runtime app never calls this again.
const requestSchema = z.object({
  text: z.string().min(3).max(500),
  duration_seconds: z.number().min(0.5).max(22).optional(),
});

export const Route = createFileRoute("/api/public/sfx")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["ELEVENLABS_API_KEY"];
        if (!apiKey) {
          return new Response("ElevenLabs is not connected", { status: 503 });
        }
        const body = requestSchema.parse(await request.json());
        const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: body.text,
            duration_seconds: body.duration_seconds,
            prompt_influence: 0.4,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          return new Response(`Provider request failed [${response.status}]: ${errorBody}`, {
            status: response.status,
          });
        }
        const audio = await response.arrayBuffer();
        return new Response(audio, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});
