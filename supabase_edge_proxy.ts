// Supabase Edge Function: proxy-fetch
// Nasaď přes Supabase Dashboard → Edge Functions → Create → název "proxy-fetch"
// Vlož tento kód jako obsah funkce.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Whitelist povolených domén
    const allowed = [
      "api.cnb.cz",
      "stooq.com",
      "query1.finance.yahoo.com",
      "query2.finance.yahoo.com",
      "api.coingecko.com",
      "api.twelvedata.com",
    ];
    const parsed = new URL(url);
    if (!allowed.some((d) => parsed.hostname.endsWith(d))) {
      return new Response(JSON.stringify({ error: "Domain not allowed" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Twelve Data: inject API key server-side (env var TWELVE_DATA_KEY)
    if (parsed.hostname === "api.twelvedata.com") {
      const tdKey = Deno.env.get("TWELVE_DATA_KEY") || "";
      if (tdKey) {
        parsed.searchParams.set("apikey", tdKey);
        url = parsed.toString();
      }
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "Kasicka/1.0" },
    });
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": resp.headers.get("Content-Type") || "text/plain",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
