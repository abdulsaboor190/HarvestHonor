/* ============================================================
   HarvestHonor — api.js
   All external AI API calls live here.
   Provider: OpenRouter → google/gemini-flash-1.5
   Fallback:  Groq     → llama-3.1-8b-instant (fast, free tier)

   ⚠️  API keys are embedded for LOCAL PROTOTYPE use only.
       Move to a backend proxy before any public deployment.
   ============================================================ */

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY  = typeof CONFIG_OPENROUTER_API_KEY !== "undefined" ? CONFIG_OPENROUTER_API_KEY : "";
const OPENROUTER_MODEL    = "google/gemini-flash-1.5";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY  = typeof CONFIG_GROQ_API_KEY !== "undefined" ? CONFIG_GROQ_API_KEY : "";
const GROQ_MODEL    = "llama-3.1-8b-instant";

/** Shown to the farmer if both AI providers fail. */
const FALLBACK_VERDICT =
  "We could not reach the AI service right now. " +
  "Please compare the prices shown manually. " +
  "If the buyer's price is significantly below the PBS market price, " +
  "consider negotiating firmly or seeking other buyers in your area.";

// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------

/**
 * getAIVerdict(crop, city, marketPrice, quotedPrice, percentageGap, verdict)
 * ---------------------------------------------------------------------------
 * Asks the AI to generate a short, farmer-friendly explanation of the
 * price comparison result. Falls back to Groq if OpenRouter fails,
 * then to a hardcoded string if both fail.
 *
 * @param {string} crop            — Display name e.g. "Wheat Flour"
 * @param {string} city            — Display name e.g. "Lahore"
 * @param {number} marketPrice     — PBS market price in Rs/kg
 * @param {number} quotedPrice     — Buyer's offered price in Rs/kg
 * @param {number} percentageGap   — Absolute % gap (always positive)
 * @param {string} verdict         — "FAIR" | "UNDERPAID"
 *
 * @returns {Promise<string>}      — AI-generated advisory text.
 */
async function getAIVerdict(
  crop,
  city,
  marketPrice,
  quotedPrice,
  percentageGap,
  verdict
) {
  const prompt = buildVerdictPrompt(crop, city, marketPrice, quotedPrice, percentageGap, verdict);

  // --- Try OpenRouter first ---
  try {
    const text = await callOpenRouter(prompt);
    console.log("[HarvestHonor/api.js] OpenRouter verdict received.");
    return text;
  } catch (err) {
    console.warn("[HarvestHonor/api.js] OpenRouter failed:", err.message, "→ trying Groq…");
  }

  // --- Fallback: Groq ---
  try {
    const text = await callGroq(prompt);
    console.log("[HarvestHonor/api.js] Groq verdict received.");
    return text;
  } catch (err) {
    console.warn("[HarvestHonor/api.js] Groq also failed:", err.message, "→ using static fallback.");
  }

  return FALLBACK_VERDICT;
}

// ------------------------------------------------------------
// PRIVATE — PROMPT BUILDER
// ------------------------------------------------------------

/**
 * buildVerdictPrompt()
 * Constructs a focused, context-rich prompt.
 * The AI response must be short (≤ 60 words) and practical.
 */
function buildVerdictPrompt(crop, city, marketPrice, quotedPrice, percentageGap, verdict) {
  const direction = verdict === "UNDERPAID"
    ? `${percentageGap.toFixed(1)}% BELOW the market rate — the farmer is being underpaid`
    : `within ${percentageGap.toFixed(1)}% of the market rate — this is a fair offer`;

  return `You are a trusted agricultural advisor helping farmers in Pakistan.

A farmer in ${city} wants to sell ${crop}.
- Official PBS market price: Rs ${marketPrice.toFixed(2)} per kg
- Buyer's offered price: Rs ${quotedPrice.toFixed(2)} per kg
- The offered price is ${direction}.
- Verdict: ${verdict}

In exactly 2-3 short sentences, give the farmer practical, honest advice.
If underpaid: encourage them to negotiate, show them the proof card, or find other buyers.
If fair: reassure them and suggest they proceed.
Use simple, plain English. Do NOT use markdown. Do NOT exceed 70 words.`;
}

// ------------------------------------------------------------
// PRIVATE — API CALLERS
// ------------------------------------------------------------

/**
 * callOpenRouter(prompt)
 * Uses the OpenAI-compatible /chat/completions endpoint.
 * Throws on HTTP error or malformed response.
 */
async function callOpenRouter(prompt) {
  const response = await fetch(OPENROUTER_BASE_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer":  "https://harvesthonor.app",   // Required by OpenRouter ToS
      "X-Title":       "HarvestHonor",
    },
    body: JSON.stringify({
      model:       OPENROUTER_MODEL,
      messages:    [{ role: "user", content: prompt }],
      max_tokens:  150,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${body}`);
  }

  const json = await response.json();

  if (!json.choices || !json.choices[0]?.message?.content) {
    throw new Error("OpenRouter returned an unexpected response shape.");
  }

  return json.choices[0].message.content.trim();
}

/**
 * callGroq(prompt)
 * Groq also exposes an OpenAI-compatible endpoint — same structure.
 * Throws on HTTP error or malformed response.
 */
async function callGroq(prompt) {
  const response = await fetch(GROQ_BASE_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [{ role: "user", content: prompt }],
      max_tokens:  150,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${body}`);
  }

  const json = await response.json();

  if (!json.choices || !json.choices[0]?.message?.content) {
    throw new Error("Groq returned an unexpected response shape.");
  }

  return json.choices[0].message.content.trim();
}
