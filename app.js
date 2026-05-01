/* ============================================================
   HarvestHonor — app.js
   Complete application logic (Phases 1–4).
   Phase 5 (AI verdict) is wired in via api.js → getAIVerdict().

   Data schema (prices.json):
   {
     "<crop_key>": {
       "<city_key>": { "price": <number per 100kg>, "confidence": "high" }
     }
   }
   NOTE: PBS prices are per 100 kg. We convert to per-kg for display.
   ============================================================ */

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const DATA_DATE   = "week of 23 April 2026";
const DATA_SOURCE = "Pakistan Bureau of Statistics";

const PRICES_JSON_PATH = "Data/prices.json";

/**
 * Percentage gap threshold.
 * If the offered price is more than this % below market, = UNDERPAID.
 */
const UNDERPAID_THRESHOLD = 5;

// ------------------------------------------------------------
// HUMAN-READABLE LABELS
// Maps JSON keys → display names shown in the UI.
// ------------------------------------------------------------

const CROP_LABELS = {
  rice_basmati: "Rice (Basmati)",
  rice_irri:    "Rice (IRRI / Non-Basmati)",
  banana:       "Banana",
  pulse_masoor: "Pulse — Masoor (Red Lentil)",
  pulse_moong:  "Pulse — Moong (Green Gram)",
  pulse_mash:   "Pulse — Mash (Black Gram)",
  pulse_gram:   "Pulse — Gram (Chickpea)",
  potato:       "Potato",
  onion:        "Onion",
  tomato:       "Tomato",
  sugar:        "Sugar",
  gur:          "Gur (Jaggery)",
  garlic:       "Garlic",
  wheat_flour:  "Wheat Flour",
};

const CITY_LABELS = {
  islamabad:   "Islamabad",
  rawalpindi:  "Rawalpindi",
  gujranwala:  "Gujranwala",
  sialkot:     "Sialkot",
  lahore:      "Lahore",
  faisalabad:  "Faisalabad",
  sargodha:    "Sargodha",
  multan:      "Multan",
  bahawalpur:  "Bahawalpur",
  karachi:     "Karachi",
  hyderabad:   "Hyderabad",
  sukkur:      "Sukkur",
  larkana:     "Larkana",
  peshawar:    "Peshawar",
  bannu:       "Bannu",
  quetta:      "Quetta",
  khuzdar:     "Khuzdar",
};

// ------------------------------------------------------------
// MODULE-LEVEL STATE
// ------------------------------------------------------------

/** @type {Object|null} Full parsed prices.json */
let priceData = null;

// ------------------------------------------------------------
// BOOTSTRAP
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(PRICES_JSON_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status} — ${PRICES_JSON_PATH}`);
    priceData = await response.json();
    console.log(`[HarvestHonor] prices.json loaded. Crops: ${Object.keys(priceData).length}`);
    showInputScreen();
  } catch (err) {
    document.getElementById("app").innerHTML = `
      <div class="card" style="margin-top:48px;text-align:center;">
        <span style="font-size:48px;">⚠️</span>
        <h2 style="color:var(--color-red);margin-top:12px;">Could not load price data</h2>
        <p class="text-muted" style="margin-top:8px;font-size:13px;line-height:1.7">
          ${err.message}<br><br>
          <strong>Tip:</strong> Open this app via a local server (e.g. VS Code Live Server)
          instead of double-clicking index.html directly.
        </p>
      </div>`;
    console.error("[HarvestHonor] Failed to load prices.json:", err);
  }
});

// ============================================================
// SCREEN 1 — INPUT SCREEN
// ============================================================

function showInputScreen() {
  const app = document.getElementById("app");

  // Build crop options
  const cropOptions = Object.keys(priceData)
    .map(key => `<option value="${key}">${CROP_LABELS[key] || key}</option>`)
    .join("");

  app.innerHTML = `
    <div class="screen-input" id="screen-input">

      <!-- Header -->
      <header class="app-header">
        <span class="logo-emoji">🌾</span>
        <span class="logo-text">HarvestHonor</span>
      </header>

      <!-- Intro copy -->
      <div class="card" style="background:var(--color-green-light);box-shadow:none;padding:var(--space-md);">
        <p style="font-size:13px;color:var(--color-green);line-height:1.6;">
          Enter your crop details below. We'll compare the buyer's quoted
          price against official <strong>${DATA_SOURCE}</strong> market
          data and tell you if you're being underpaid.
        </p>
      </div>

      <!-- Form -->
      <form id="compare-form" novalidate>

        <!-- Crop -->
        <div class="form-group">
          <label class="form-label" for="input-crop">Crop</label>
          <div class="select-wrapper">
            <select class="form-select" id="input-crop" required>
              <option value="" disabled selected>Select a crop…</option>
              ${cropOptions}
            </select>
          </div>
          <span class="form-error-msg hidden" id="err-crop">Please select a crop.</span>
        </div>

        <!-- City -->
        <div class="form-group">
          <label class="form-label" for="input-city">Your City / Market</label>
          <div class="select-wrapper">
            <select class="form-select" id="input-city" required>
              <option value="" disabled selected>Select crop first…</option>
            </select>
          </div>
          <span class="form-error-msg hidden" id="err-city">Please select a city.</span>
        </div>

        <!-- Quantity -->
        <div class="form-group">
          <label class="form-label" for="input-qty">Quantity (kg)</label>
          <input
            class="form-input"
            type="number"
            id="input-qty"
            placeholder="e.g. 500"
            min="1"
            step="1"
            required
          />
          <span class="form-error-msg hidden" id="err-qty">Enter a valid quantity (min 1 kg).</span>
        </div>

        <!-- Quoted Price -->
        <div class="form-group">
          <label class="form-label" for="input-price">Buyer's Offered Price (Rs per kg)</label>
          <input
            class="form-input"
            type="number"
            id="input-price"
            placeholder="e.g. 150"
            min="1"
            step="0.01"
            required
          />
          <span class="form-error-msg hidden" id="err-price">Enter a valid price (Rs per kg).</span>
        </div>

        <button class="btn btn-primary" type="submit" id="btn-compare">
          Compare My Price →
        </button>

      </form>

      <!-- Attribution -->
      <p style="font-size:11px;color:var(--color-muted);text-align:center;line-height:1.5;">
        Market data: <strong>${DATA_SOURCE}</strong> · ${DATA_DATE}
      </p>

    </div>
  `;

  // ---- Dynamic city population when crop changes ----
  const cropSelect = document.getElementById("input-crop");
  const citySelect = document.getElementById("input-city");

  cropSelect.addEventListener("change", () => {
    const cropKey = cropSelect.value;
    const cities  = priceData[cropKey] ? Object.keys(priceData[cropKey]) : [];

    citySelect.innerHTML = cities.length
      ? `<option value="" disabled selected>Select a city…</option>` +
        cities.map(c => `<option value="${c}">${CITY_LABELS[c] || c}</option>`).join("")
      : `<option value="" disabled selected>No cities available</option>`;

    // Clear city error if re-populating
    document.getElementById("err-city").classList.add("hidden");
    citySelect.classList.remove("error");
  });

  // ---- Form submission ----
  document.getElementById("compare-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const cropKey     = cropSelect.value;
    const cityKey     = citySelect.value;
    const quantity    = parseFloat(document.getElementById("input-qty").value);
    const quotedPrice = parseFloat(document.getElementById("input-price").value);

    if (!validateInputs(cropKey, cityKey, quantity, quotedPrice)) return;

    try {
      showSpinner("Calculating market price…");
      const data = await comparePrice(cropKey, cityKey, quantity, quotedPrice);
      hideSpinner();
      showResultScreen(data);
    } catch (err) {
      hideSpinner();
      alert("Something went wrong: " + err.message);
      console.error(err);
    }
  });
}

/** Returns true if all fields are valid; shows inline errors otherwise. */
function validateInputs(crop, city, quantity, quotedPrice) {
  let valid = true;

  const setError = (id, fieldId, show) => {
    document.getElementById(id).classList.toggle("hidden", !show);
    document.getElementById(fieldId).classList.toggle("error", show);
    if (show) valid = false;
  };

  setError("err-crop",  "input-crop",  !crop);
  setError("err-city",  "input-city",  !city);
  setError("err-qty",   "input-qty",   !quantity || quantity < 1);
  setError("err-price", "input-price", !quotedPrice || quotedPrice < 1);

  return valid;
}

// ============================================================
// SCREEN 2 — RESULT SCREEN
// ============================================================

function showResultScreen(data) {
  const app = document.getElementById("app");

  const isFair        = data.verdict === "FAIR";
  const verdictClass  = isFair ? "verdict-fair" : "verdict-underpaid";
  const verdictEmoji  = isFair ? "✅" : "🚨";
  const verdictTitle  = isFair ? "Fair Price" : "You May Be Underpaid!";
  const verdictSub    = isFair
    ? `The offered price is within ${UNDERPAID_THRESHOLD}% of the PBS market rate.`
    : `You are being offered ${formatPercent(data.percentageGap)} less than the PBS market rate.`;

  const totalMarket = data.marketPrice * data.quantity;
  const totalQuoted = data.quotedPrice  * data.quantity;
  const totalLoss   = totalMarket - totalQuoted;

  app.innerHTML = `
    <div class="screen-result" id="screen-result">

      <!-- Header -->
      <header class="app-header">
        <span class="logo-emoji">🌾</span>
        <span class="logo-text">HarvestHonor</span>
      </header>

      <!-- Verdict Banner -->
      <div class="verdict-banner ${verdictClass}">
        <span class="verdict-emoji">${verdictEmoji}</span>
        <div class="verdict-headline">${verdictTitle}</div>
        <div class="verdict-subtext">${verdictSub}</div>
      </div>

      <!-- Price Breakdown Card -->
      <div class="card">
        <div class="price-row">
          <span class="label">Crop</span>
          <span class="value">${CROP_LABELS[data.crop] || data.crop}</span>
        </div>
        <div class="price-row">
          <span class="label">Market (${CITY_LABELS[data.city] || data.city})</span>
          <span class="value">${formatPKR(data.marketPrice)} / kg</span>
        </div>
        <div class="price-row">
          <span class="label">Buyer Offered</span>
          <span class="value ${isFair ? "text-green" : "text-red"}">${formatPKR(data.quotedPrice)} / kg</span>
        </div>
        <div class="price-row">
          <span class="label">Gap</span>
          <span class="value ${isFair ? "text-green" : "text-red"}">${isFair ? "−" : "−"}${formatPercent(data.percentageGap)}</span>
        </div>
        <div class="divider"></div>
        <div class="price-row">
          <span class="label">Your Quantity</span>
          <span class="value">${data.quantity.toLocaleString()} kg</span>
        </div>
        <div class="price-row">
          <span class="label">Market Value (total)</span>
          <span class="value">${formatPKR(totalMarket)}</span>
        </div>
        <div class="price-row">
          <span class="label">Offered Value (total)</span>
          <span class="value">${formatPKR(totalQuoted)}</span>
        </div>
        ${!isFair ? `
        <div class="price-row">
          <span class="label" style="color:var(--color-red);">Potential Loss</span>
          <span class="value text-red">−${formatPKR(totalLoss)}</span>
        </div>` : ""}
      </div>

      <!-- AI Verdict Card -->
      <div class="card" id="ai-verdict-card" style="border-left: 4px solid ${isFair ? "var(--color-green)" : "var(--color-red)"};">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-muted);margin-bottom:8px;">
          🤖 AI Advisory
        </p>
        <p id="ai-verdict-text" style="font-size:14px;line-height:1.7;color:var(--color-text);">
          ${data.aiVerdict || '<span class="text-muted">Loading AI advisory…</span>'}
        </p>
      </div>

      <!-- Attribution -->
      <div class="attribution-chip">
        📊 ${DATA_SOURCE} · ${DATA_DATE}
      </div>

      <!-- Actions -->
      <button class="btn btn-primary" id="btn-proof-card">
        📄 Get Proof Card
      </button>
      <button class="btn btn-secondary" id="btn-start-over" style="margin-top:0">
        ← Compare Another Crop
      </button>

    </div>
  `;

  // Buttons
  document.getElementById("btn-proof-card").addEventListener("click", () => showProofCard(data));
  document.getElementById("btn-start-over").addEventListener("click", () => showInputScreen());

  // If AI verdict not yet loaded, fetch it asynchronously and inject
  if (!data.aiVerdict) {
    getAIVerdict(
      CROP_LABELS[data.crop] || data.crop,
      CITY_LABELS[data.city] || data.city,
      data.marketPrice,
      data.quotedPrice,
      data.percentageGap,
      data.verdict
    ).then(text => {
      data.aiVerdict = text;
      const el = document.getElementById("ai-verdict-text");
      if (el) el.textContent = text;
    }).catch(() => {
      const el = document.getElementById("ai-verdict-text");
      if (el) el.textContent = "AI advisory unavailable right now.";
    });
  }
}

// ============================================================
// SCREEN 3 — PROOF CARD
// ============================================================

function showProofCard(data) {
  const app = document.getElementById("app");

  const isFair       = data.verdict === "FAIR";
  const verdictColor = isFair ? "var(--color-green)" : "var(--color-red)";
  const verdictBg    = isFair ? "var(--color-green-light)" : "var(--color-red-light)";
  const verdictEmoji = isFair ? "✅" : "🚨";
  const verdictLabel = isFair ? "FAIR PRICE" : "UNDERPAID";

  app.innerHTML = `
    <div class="screen-proof-card" id="screen-proof-card">

      <!-- Header -->
      <header class="app-header" style="width:100%;">
        <span class="logo-emoji">🌾</span>
        <span class="logo-text">HarvestHonor</span>
      </header>

      <p class="text-muted" style="font-size:13px;text-align:center;">
        Your Proof Card is ready. Capture or share it as evidence.
      </p>

      <!-- ===== THE CARD (captured by html2canvas) ===== -->
      <div class="proof-card" id="proof-card">

        <div class="proof-card-header">
          <div class="app-name">🌾 HarvestHonor</div>
          <div class="tagline">AI-Powered Crop Price Verification</div>
        </div>

        <div class="proof-card-body">

          <!-- Verdict badge -->
          <div style="text-align:center;margin-bottom:16px;">
            <span style="
              display:inline-block;
              background:${verdictBg};
              color:${verdictColor};
              padding:8px 20px;
              border-radius:999px;
              font-size:18px;
              font-weight:800;
              letter-spacing:.04em;">
              ${verdictEmoji} ${verdictLabel}
            </span>
          </div>

          <!-- Crop & City -->
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span style="color:#666;">Crop</span>
            <span style="font-weight:700;">${CROP_LABELS[data.crop] || data.crop}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:14px;">
            <span style="color:#666;">Market / City</span>
            <span style="font-weight:700;">${CITY_LABELS[data.city] || data.city}</span>
          </div>

          <div style="height:1px;background:#E0E0E0;margin-bottom:16px;"></div>

          <!-- Prices -->
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span style="color:#666;">PBS Market Price</span>
            <span style="font-weight:700;">${formatPKR(data.marketPrice)} / kg</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span style="color:#666;">Buyer Offered</span>
            <span style="font-weight:700;color:${verdictColor};">${formatPKR(data.quotedPrice)} / kg</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:14px;">
            <span style="color:#666;">Price Gap</span>
            <span style="font-weight:800;color:${verdictColor};">−${formatPercent(data.percentageGap)}</span>
          </div>

          <div style="height:1px;background:#E0E0E0;margin-bottom:16px;"></div>

          <!-- Totals -->
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span style="color:#666;">Quantity</span>
            <span style="font-weight:700;">${data.quantity.toLocaleString()} kg</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;">
            <span style="color:#666;">You Should Receive</span>
            <span style="font-weight:700;">${formatPKR(data.marketPrice * data.quantity)}</span>
          </div>
          ${!isFair ? `
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:14px;">
            <span style="color:var(--color-red);">Potential Loss</span>
            <span style="font-weight:800;color:var(--color-red);">−${formatPKR((data.marketPrice - data.quotedPrice) * data.quantity)}</span>
          </div>` : ""}

          ${data.aiVerdict ? `
          <div style="margin-top:16px;padding:12px;background:#F9F9F9;border-radius:8px;font-size:12px;color:#444;line-height:1.6;">
            🤖 <em>${data.aiVerdict}</em>
          </div>` : ""}

        </div>

        <div class="proof-card-footer">
          📊 Data: ${DATA_SOURCE} · ${DATA_DATE}<br>
          <span style="font-size:10px;">harvesthonor.app · Verify prices before negotiating</span>
        </div>

      </div>
      <!-- ===== END PROOF CARD ===== -->

      <!-- Actions -->
      <button class="btn btn-primary" id="btn-generate-image">
        📸 Generate Share Image
      </button>
      <button class="btn btn-secondary" id="btn-back-result" style="margin-top:0;">
        ← Back to Results
      </button>

    </div>
  `;

  document.getElementById("btn-back-result").addEventListener("click", () => showResultScreen(data));

  document.getElementById("btn-generate-image").addEventListener("click", async () => {
    const btn = document.getElementById("btn-generate-image");
    btn.disabled = true;
    btn.textContent = "⏳ Generating…";

    try {
      const canvas = await html2canvas(document.getElementById("proof-card"), {
        scale: 2,          // 2× for sharp screens
        useCORS: true,
        backgroundColor: "#FFFFFF",
      });
      const imageDataUrl = canvas.toDataURL("image/png");
      showShareScreen({ ...data, imageDataUrl });
    } catch (err) {
      alert("Could not generate image: " + err.message);
      btn.disabled  = false;
      btn.textContent = "📸 Generate Share Image";
      console.error(err);
    }
  });
}

// ============================================================
// SCREEN 4 — SHARE SCREEN
// ============================================================

function showShareScreen(data) {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="screen-share" id="screen-share">

      <!-- Header -->
      <header class="app-header" style="width:100%;">
        <span class="logo-emoji">🌾</span>
        <span class="logo-text">HarvestHonor</span>
      </header>

      <p style="font-size:15px;font-weight:700;text-align:center;">Your Proof Card is Ready! 🎉</p>
      <p class="text-muted" style="font-size:13px;text-align:center;">
        Download or share it as evidence when negotiating with buyers.
      </p>

      <!-- Image Preview -->
      <div class="share-preview">
        <img src="${data.imageDataUrl}" alt="HarvestHonor Proof Card" />
      </div>

      <!-- Download -->
      <button class="btn btn-primary" id="btn-download">
        ⬇️ Download Image
      </button>

      <!-- Native Share (if supported) -->
      ${navigator.share ? `
      <button class="btn btn-share" id="btn-native-share">
        📤 Share via WhatsApp / SMS
      </button>` : ""}

      <!-- Copy advice -->
      <p class="text-muted" style="font-size:12px;text-align:center;line-height:1.6;">
        Long-press the image above to save it, or use the download button.<br>
        Share on WhatsApp to get a better price from your buyer!
      </p>

      <button class="btn btn-secondary" id="btn-start-over-share">
        🔄 Compare Another Crop
      </button>

    </div>
  `;

  // Download
  document.getElementById("btn-download").addEventListener("click", () => {
    const a      = document.createElement("a");
    a.href       = data.imageDataUrl;
    a.download   = `harvesthonor-proof-${data.crop}-${data.city}.png`;
    a.click();
  });

  // Native Web Share API
  const nativeBtn = document.getElementById("btn-native-share");
  if (nativeBtn) {
    nativeBtn.addEventListener("click", async () => {
      try {
        // Convert dataURL → Blob → File for sharing
        const res   = await fetch(data.imageDataUrl);
        const blob  = await res.blob();
        const file  = new File([blob], "harvesthonor-proof.png", { type: "image/png" });

        await navigator.share({
          title: "HarvestHonor Proof Card",
          text:  `I checked the PBS market price for ${CROP_LABELS[data.crop] || data.crop} in ${CITY_LABELS[data.city] || data.city}. Here's my price verification.`,
          files: [file],
        });
      } catch (err) {
        // User cancelled or share not supported with files — silently ignore
        console.warn("Share cancelled or unsupported:", err.message);
      }
    });
  }

  document.getElementById("btn-start-over-share").addEventListener("click", () => showInputScreen());
}

// ============================================================
// CORE BUSINESS LOGIC
// ============================================================

/**
 * comparePrice()
 * Looks up PBS market price, computes gap, then calls AI for a verdict.
 *
 * PBS prices in JSON are per 100 kg → divide by 100 to get per-kg.
 */
async function comparePrice(crop, city, quantity, quotedPrice) {
  if (!priceData[crop]) throw new Error(`No data found for crop: ${crop}`);
  if (!priceData[crop][city]) throw new Error(`No data for ${crop} in ${city}`);

  const marketPricePer100 = priceData[crop][city].price;
  const marketPrice       = marketPricePer100 / 100;           // Rs per kg

  // Gap: positive = farmer is being underpaid
  const percentageGap = ((marketPrice - quotedPrice) / marketPrice) * 100;
  const verdict       = percentageGap > UNDERPAID_THRESHOLD ? "UNDERPAID" : "FAIR";

  console.log(`[HarvestHonor] comparePrice → market: ${marketPrice}, offered: ${quotedPrice}, gap: ${percentageGap.toFixed(2)}%, verdict: ${verdict}`);

  // Fetch AI verdict (non-blocking — UI shows loading state)
  let aiVerdict = null;
  try {
    aiVerdict = await getAIVerdict(
      CROP_LABELS[crop] || crop,
      CITY_LABELS[city] || city,
      marketPrice,
      quotedPrice,
      percentageGap,
      verdict
    );
  } catch (err) {
    console.warn("[HarvestHonor] AI verdict failed:", err.message);
    aiVerdict = null;
  }

  return {
    crop,
    city,
    quantity,
    quotedPrice,
    marketPrice,
    percentageGap: Math.abs(percentageGap),   // always display as positive
    verdict,
    aiVerdict,
    confidence: priceData[crop][city].confidence || "high",
  };
}

// ============================================================
// HELPER UTILITIES
// ============================================================

/** Format a number as Pakistani Rupees. e.g. 1500 → "Rs 1,500" */
function formatPKR(amount) {
  if (amount == null || isNaN(amount)) return "—";
  return "Rs " + Number(amount).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

/** Format a percentage to 1 decimal place. e.g. 12.3456 → "12.3%" */
function formatPercent(value) {
  if (value == null || isNaN(value)) return "—";
  return Math.abs(value).toFixed(1) + "%";
}

/** Inject a full-screen loading overlay. */
function showSpinner(message = "Loading…") {
  hideSpinner();
  const overlay = document.createElement("div");
  overlay.className = "spinner-overlay";
  overlay.id = "spinner-overlay";
  overlay.innerHTML = `
    <div class="spinner" role="status" aria-label="Loading"></div>
    <p class="spinner-label">${message}</p>
  `;
  document.body.appendChild(overlay);
}

/** Remove the loading overlay. */
function hideSpinner() {
  const el = document.getElementById("spinner-overlay");
  if (el) el.remove();
}
