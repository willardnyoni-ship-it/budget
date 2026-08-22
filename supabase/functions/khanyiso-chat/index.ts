// Khanyiso - the in-app assistant. Deploy with:
//   supabase functions deploy khanyiso-chat
// and set the secret with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// This function is the ONLY place the Anthropic API key lives. It is never
// shipped in app.html or any client file. The client sends chat messages
// plus a small summary of the signed-in user's own budget data; this
// function checks the caller is a real signed-in user (via their Supabase
// auth token) before spending your API credit, then relays the request to
// Claude with a system prompt that keeps Khanyiso on-topic and away from
// financial advice.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Change this to your real deployed origin(s) once you have one, e.g.
// "https://willardnyoni-ship-it.github.io" - "*" is fine while testing.
const ALLOWED_ORIGIN = "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-5"; // swap to "claude-haiku-4-5-20251001" if you want a cheaper/faster model
const MAX_TOKENS = 700;
const MAX_HISTORY_MESSAGES = 16; // caps how much of the conversation we forward, for cost control
const MAX_CONTEXT_CHARS = 6000; // caps the data-summary block the client can send

const SYSTEM_PROMPT = `You are Khanyiso, a friendly assistant built into a personal budgeting app.

Your ONLY job: help the user understand THEIR OWN data that is already summarised for you below - their spending, categories, budget targets, transactions, trends, and savings progress in this app. Answer naturally and conversationally, like a sharp friend who's looked at their numbers with them.

Hard rules, no exceptions:
1. You may only use the CURRENT USER DATA block below. You have no other source of truth - treat your own general knowledge as off-limits for this conversation. Never invent numbers, categories, or transactions that aren't in that block.
2. Stay strictly inside the app's scope: their own spending, categories, budget targets, transactions, trends, and savings progress, as given to you. If asked anything outside that - general knowledge, current events, other people's finances, how something works in the world, coding help, unrelated trivia, anything not derivable from the data block - say plainly that you can only help with what's in their budget data in this app, and do not attempt to answer it anyway. This applies even if you happen to know the answer.
3. You are NOT a financial advisor and must never act like one. Do not recommend how someone should invest, save, borrow, use debt, choose financial products (accounts, ETFs, retirement annuities, insurance, crypto, etc.), or make any other financial planning or investment decision. Do not give tax advice, even in general terms.
4. If asked for financial advice, briefly decline, say you're not able to give financial advice and they should speak to a qualified, licensed financial advisor, then - if there's something in their data you *can* help with - offer that instead. Keep the decline short; don't lecture.
5. You can: explain what's in their budget, add up or compare spending, spot patterns, explain what a number means, answer "how much did I spend on X", "am I on track", "what's my biggest category", etc. - all strictly from the data given.
6. You cannot: tell them whether a purchase, saving amount, or financial choice is a "good idea," predict markets, explain general financial/economic concepts unprompted by their data, or give any recommendation framed as what they personally should do with their money going forward, beyond describing their own budget/data.
7. Keep replies short and conversational - a few sentences, not a report. Use the currency figures exactly as given (already formatted in Rand).`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required." }, 401);

    // Verify the caller is a real signed-in user of this app before we spend API credit.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Sign in required." }, 401);

    const payload = await req.json().catch(() => null);
    if (!payload || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      return json({ error: "No messages provided." }, 400);
    }

    let { messages, context } = payload as { messages: { role: string; content: string }[]; context?: string };

    // Keep cost/latency bounded regardless of what the client sends.
    messages = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    }));
    context = String(context ?? "").slice(0, MAX_CONTEXT_CHARS);

    const system = SYSTEM_PROMPT + "\n\n--- CURRENT USER DATA ---\n" + context;

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
      }),
    });

    const data = await anthropicResp.json();
    if (!anthropicResp.ok) {
      console.error("Anthropic error:", data);
      return json({ error: "Khanyiso is having trouble right now. Try again shortly." }, 502);
    }

    const reply = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    return json({ reply: reply || "I'm not sure how to answer that from your data." });
  } catch (e) {
    console.error("khanyiso-chat error:", e);
    return json({ error: "Something went wrong." }, 500);
  }
});
