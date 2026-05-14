import { createFileRoute } from "@tanstack/react-router";

const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/lezkfugvvv8k4ja54jxsmoh94casxduj";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export const Route = createFileRoute("/api/public/checkin")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      },

      POST: async ({ request }) => {
        try {
          const payload = await request.json();

          const response = await fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            return jsonResponse({ error: "Webhook rejected request" }, 502);
          }

          return jsonResponse({ success: true });
        } catch {
          return jsonResponse({ error: "Failed to forward check-in" }, 500);
        }
      },
    },
  },
});