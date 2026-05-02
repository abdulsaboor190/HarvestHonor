/* ============================================================
   HarvestHonor — app.js
   ============================================================ */

const DATA_DATE   = "week of 23 April 2026";
const DATA_SOURCE = "Pakistan Bureau of Statistics";
const PRICES_JSON_PATH = "Data/prices.json";

let priceData = null;

let currentScreen = "input";
let currentScreenData = null;
let savedCrop = "";
let savedCity = "";

function renderCurrentScreen() {
  if (currentScreen === "input") showInputScreen();
  else if (currentScreen === "result") showResultScreen(currentScreenData);
  else if (currentScreen === "proof") showProofCard(currentScreenData);
}

function handleLangToggle() {
  if (typeof toggleLanguage === 'function') {
    toggleLanguage();
  }
  renderCurrentScreen();
}

function getToggleButtonHTML() {
  return `
    <button onclick="handleLangToggle()" style="position:absolute; top:16px; right:16px; font-size:12px; padding:6px 12px; border:1px solid #ccc; background:white; border-radius:16px; cursor:pointer; z-index:100;">
      ${t().toggleLang}
    </button>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(PRICES_JSON_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    priceData = await response.json();
    showInputScreen();
  } catch (err) {
    document.getElementById("app").innerHTML = `<div style="padding:20px;color:red;text-align:center;">Error loading prices.json<br>${err.message}</div>`;
  }
});

function showInputScreen() {
  currentScreen = "input";
  const app = document.getElementById("app");
  
  let cropOptions = `<option value="" disabled ${!savedCrop ? 'selected' : ''}>${t().placeholderCrop}</option>`;
  if (priceData) {
    for (const cropKey in priceData) {
      const cropName = cropKey.charAt(0).toUpperCase() + cropKey.slice(1);
      cropOptions += `<option value="${cropKey}" ${savedCrop === cropKey ? 'selected' : ''}>${cropName}</option>`;
    }
  }

  app.innerHTML = `
    ${getToggleButtonHTML()}
    <header class="app-header">
      <h1>${t().appName}</h1>
      <p>${t().appSubtitle}</p>
    </header>
    <div class="form-container">
      <div id="global-error" class="global-error"></div>
      
      <div class="form-group">
        <label for="crop-select">${t().labelCrop}</label>
        <select id="crop-select">${cropOptions}</select>
        <div id="crop-error" class="form-error">${t().errorSelectCrop}</div>
      </div>
      
      <div class="form-group">
        <label for="city-select">${t().labelCity}</label>
        <select id="city-select">
          <option value="" disabled selected>${t().placeholderCity}</option>
        </select>
        <div id="city-error" class="form-error">${t().errorSelectCity}</div>
      </div>
      
      <div class="form-group">
        <label for="quantity-input">${t().labelQuantity}</label>
        <input type="number" id="quantity-input" placeholder="${t().placeholderQuantity}" min="1">
        <div id="quantity-error" class="form-error">${t().errorInvalidQty}</div>
      </div>
      
      <div class="form-group">
        <label for="quoted-price-input">${t().labelQuotedPrice}</label>
        <input type="number" id="quoted-price-input" placeholder="${t().placeholderPrice}" min="1">
        <div id="price-error" class="form-error">${t().errorInvalidPrice}</div>
      </div>
      
      <button id="btn-submit" class="btn btn-primary">${t().btnCheckPrice}</button>
    </div>
  `;

  const cropSelect = document.getElementById("crop-select");
  const citySelect = document.getElementById("city-select");
  const btnSubmit = document.getElementById("btn-submit");

  function populateCities() {
    const selectedCrop = cropSelect.value;
    if (priceData && priceData[selectedCrop]) {
      let cityOptions = `<option value="" disabled ${!savedCity ? 'selected' : ''}>${t().placeholderCity}</option>`;
      for (const cityKey in priceData[selectedCrop]) {
        const cityName = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
        cityOptions += `<option value="${cityKey}" ${savedCity === cityKey ? 'selected' : ''}>${cityName}</option>`;
      }
      citySelect.innerHTML = cityOptions;
    } else {
      citySelect.innerHTML = `<option value="" disabled selected>${t().placeholderCity}</option>`;
    }
  }

  // Edge Case 4: Keep the previously selected crop and city 
  if (savedCrop) {
    populateCities();
  }

  cropSelect.addEventListener("change", () => {
    savedCity = ""; 
    populateCities();
  });

  btnSubmit.addEventListener("click", () => {
    // Reset errors
    document.getElementById("global-error").textContent = "";
    document.getElementById("crop-error").classList.remove("visible");
    document.getElementById("city-error").classList.remove("visible");
    document.getElementById("quantity-error").classList.remove("visible");
    document.getElementById("price-error").classList.remove("visible");

    // Read values
    const crop = cropSelect.value;
    const city = citySelect.value;
    const quantityStr = document.getElementById("quantity-input").value;
    const priceStr = document.getElementById("quoted-price-input").value;

    let isValid = true;

    if (!crop) {
      document.getElementById("crop-error").classList.add("visible");
      isValid = false;
    }
    if (!city || city === "") {
      document.getElementById("city-error").classList.add("visible");
      isValid = false;
    }
    const quantity = parseFloat(quantityStr);
    if (!quantityStr || isNaN(quantity) || quantity < 1) {
      document.getElementById("quantity-error").classList.add("visible");
      isValid = false;
    }
    const quotedPrice = parseFloat(priceStr);
    if (!priceStr || isNaN(quotedPrice) || quotedPrice < 1) {
      document.getElementById("price-error").classList.add("visible");
      isValid = false;
    }

    if (!isValid) return;

    const data = comparePrice(crop, city, quantity, quotedPrice);
    
    savedCrop = crop;
    savedCity = city;

    // Edge Case 1: Missing crop/city data
    if (data.error && (data.error.includes("Data not available") || data.error.includes("ڈیٹا دستیاب نہیں"))) {
      currentScreen = "result";
      currentScreenData = data;
      showErrorCard(data.error);
      return;
    }

    if (data.error) {
      document.getElementById("global-error").textContent = data.error;
      return;
    }

    const actions = getActionOptions(data.verdict, data.confidenceLevel);
    data.actions = actions; 

    showResultScreen(data);
  });
}

function showErrorCard(errorMsg) {
  const app = document.getElementById("app");
  app.innerHTML = `
    ${getToggleButtonHTML()}
    <div style="padding: 16px;">
      <div style="background: white; border-left: 4px solid #E65100; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 40px;">
        <div style="font-size: 32px; margin-bottom: 12px;">⚠</div>
        <h3 style="font-size: 16px; margin-bottom: 16px; color: var(--color-text);">${errorMsg}</h3>
        <a href="https://www.pbs.gov.pk/spi" target="_blank" style="color: #1565C0; text-decoration: underline; font-size: 14px; display: block; margin-bottom: 24px;">Check pbs.gov.pk →</a>
        <button id="btn-back-error" class="btn btn-primary">${t().btnBack}</button>
      </div>
    </div>
  `;
  document.getElementById("btn-back-error").addEventListener("click", () => {
    showInputScreen();
  });
}

function showResultScreen(data) {
  currentScreen = "result";
  currentScreenData = data;
  const app = document.getElementById("app");
  
  let bannerClass = "";
  let bannerTitle = "";
  let bannerSub = "";

  if (data.verdict === "underpaid") {
    bannerClass = "underpaid";
    bannerTitle = t().verdictUnderpaid;
    bannerSub = `${t().verdictUnderpaidSub} ${Math.abs(data.percentageGap)}%`;
  } else if (data.verdict === "fair") {
    bannerClass = "fair";
    bannerTitle = t().verdictFair;
    bannerSub = t().verdictFairSub;
  } else if (data.verdict === "above_market") {
    bannerClass = "above-market";
    bannerTitle = t().verdictAbove;
    bannerSub = t().verdictAboveSub;
  }

  const diffVal = Math.abs(data.rupeeDifference).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const diffStr = data.rupeeDifference < 0 ? `Rs -${diffVal}` : `Rs +${diffVal}`;
  const diffClass = data.rupeeDifference < 0 ? "text-red" : "text-green";

  let confClass = "";
  let confText = "";
  if (data.confidenceLevel === "high") {
    confClass = "high";
    confText = t().confidenceHigh;
  } else if (data.confidenceLevel === "moderate") {
    confClass = "moderate";
    confText = t().confidenceModerate;
  }

  const cropName = data.crop.charAt(0).toUpperCase() + data.crop.slice(1);
  const cityName = data.city.charAt(0).toUpperCase() + data.city.slice(1);

  const chipsHtml = (data.actions || []).map(action => 
    `<div class="chip">${action}</div>`
  ).join('');

  app.innerHTML = `
    ${getToggleButtonHTML()}
    <div class="verdict-banner ${bannerClass}">
      <h2>${bannerTitle}</h2>
      <p>${bannerSub}</p>
    </div>

    <div class="result-container">
      <div class="card">
        <div class="price-row">
          <span class="label">${t().labelMarketPrice}</span>
          <span class="value">Rs ${data.marketPrice.toLocaleString()} / 100kg</span>
        </div>
        <div class="price-row">
          <span class="label">${t().labelQuoted}</span>
          <span class="value">Rs ${data.quotedPrice.toLocaleString()} / 100kg</span>
        </div>
        <div class="price-row">
          <span class="label">${t().labelDifference}</span>
          <span class="value ${diffClass}">${diffStr} total on ${data.quantity}kg</span>
        </div>
        <div class="price-row">
          <span class="label">${t().labelCropCity}</span>
          <span class="value">${cropName} — ${cityName}</span>
        </div>
      </div>

      <div class="confidence-wrapper">
        <div class="confidence-pill ${confClass}">${confText}</div>
      </div>

      <div class="action-section">
        <h3>${t().labelWhatToDo}</h3>
        <div class="chip-container">
          ${chipsHtml}
        </div>
      </div>

      <div id="ai-section" style="margin-bottom: 24px;">
        <div style="text-align:center; padding:20px;">
          <div style="display:inline-block; font-size: 24px;">⏳</div>
          <p style="margin-top:8px; font-size:14px; color:var(--color-muted);">${t().labelAILoading}</p>
        </div>
      </div>

      <button id="btn-proof" class="btn btn-dark">${t().btnGenerateProof}</button>

      <div style="background: #E3F2FD; border: 1px solid #90CAF9; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #1565C0; margin-top: 16px; margin-bottom: 16px; display: flex; align-items: start; gap: 8px;">
        <span style="font-size: 14px;">ℹ</span>
        <span>${t().labelUpdateNote}</span>
      </div>

      <p class="footer-source">${t().labelSource}<br>${t().labelDataDate}</p>

      <button id="btn-back" class="back-link">${t().btnBack}</button>
    </div>
  `;

  document.getElementById("btn-proof").addEventListener("click", () => {
    showProofCard(data);
  });

  document.getElementById("btn-back").addEventListener("click", () => {
    showInputScreen();
  });

  if (typeof getAIVerdict === 'function' && !data.aiResult) {
    let aiResolved = false;

    // Edge Case 2: AI takes too long
    const aiTimeout = setTimeout(() => {
      if (!aiResolved) {
        aiResolved = true;
        const fallbackAi = {
          urdu_line: "سرکاری ریکارڈ کے مطابق یہ قیمت بازار سسے کم ہے — براہ کرم دوبارہ غور کریں۔",
          explanation: "AI explanation unavailable right now — price comparison above is still accurate",
          isFallback: true
        };
        data.aiResult = fallbackAi;
        renderAiBoxes(fallbackAi);
      }
    }, 8000);

    getAIVerdict(data.crop, data.city, data.marketPrice, data.quotedPrice, data.percentageGap, data.verdict)
      .then(aiData => {
        if (!aiResolved) {
          aiResolved = true;
          clearTimeout(aiTimeout);
          data.aiResult = aiData;
          renderAiBoxes(aiData);
        }
      })
      .catch(err => {
        if (!aiResolved) {
          aiResolved = true;
          clearTimeout(aiTimeout);
          const fallbackAi = {
            urdu_line: "سرکاری ریکارڈ کے مطابق یہ قیمت بازار سسے کم ہے — براہ کرم دوبارہ غور کریں۔",
            explanation: "AI explanation unavailable right now — price comparison above is still accurate",
            isFallback: true
          };
          data.aiResult = fallbackAi;
          renderAiBoxes(fallbackAi);
        }
      });
  } else if (data.aiResult) {
    renderAiBoxes(data.aiResult);
  }

  function renderAiBoxes(aiData) {
    const aiSec = document.getElementById("ai-section");
    if (!aiSec) return;

    let html = `
      <div style="background-color: #FFFDE7; border: 1px solid #F9A825; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="font-size: 12px; color: var(--color-muted); margin-bottom: 8px;">${t().labelYouCanSay}</div>
        <div dir="rtl" style="font-weight: bold; font-size: 17px; color: var(--color-text);">${aiData.urdu_line}</div>
        ${aiData.isFallback ? `<div style="font-size: 11px; color: var(--color-muted); margin-top: 8px;">${t().labelAIUnavailable}</div>` : ''}
      </div>
    `;

    if (!aiData.isFallback && aiData.explanation) {
      html += `
        <div style="background-color: #F5F5F5; border: 1px solid #E0E0E0; border-radius: 8px; padding: 14px;">
          <div style="font-size: 12px; color: var(--color-muted); margin-bottom: 8px;">${t().labelWhyHappening}</div>
          <div style="font-size: 14px; color: var(--color-muted); font-weight: normal;">${aiData.explanation}</div>
        </div>
      `;
    }

    aiSec.innerHTML = html;
  }
}

function showProofCard(data) {
  currentScreen = "proof";
  currentScreenData = data;
  const app = document.getElementById("app");
  
  const isLoss = data.rupeeDifference < 0;
  const diffColor = isLoss ? 'var(--color-red)' : 'var(--color-green)';
  const diffWord = isLoss ? t().totalDiffLoss : t().totalDiffGain;
  const diffAbs = Math.abs(data.rupeeDifference).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const pctAbs = Math.abs(data.percentageGap);
  
  let headerColor = 'var(--color-green)';
  let statusText = '';
  let rightBoxBg = '#E8F5E9';
  let cardBorder = '2px solid var(--color-green)';
  
  if (data.verdict === 'underpaid') {
    headerColor = 'var(--color-red)';
    statusText = `${t().verdictUnderpaid} — ${pctAbs}%`;
    rightBoxBg = '#FFEBEE';
    cardBorder = '2px solid var(--color-red)';
  } else if (data.verdict === 'fair') {
    statusText = `${t().verdictFair} — ${t().verdictFairSub}`;
  } else {
    statusText = `${t().verdictAbove} — ${pctAbs}%`;
  }

  const cropName = data.crop.charAt(0).toUpperCase() + data.crop.slice(1);
  const cityName = data.city.charAt(0).toUpperCase() + data.city.slice(1);

  const diffLine = t().totalDiffLine
    .replace("[qty]", data.quantity)
    .replace("[amt]", diffAbs)
    .replace("[type]", diffWord);

  app.innerHTML = `
    ${getToggleButtonHTML()}
    <div style="padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
      <div id="proof-card" style="background: white; border-radius: 12px; border: ${cardBorder}; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 0; max-width: 400px; margin: 40px auto 0; overflow: hidden; position: relative;">
        <div style="width: 100%; height: 48px; background-color: ${headerColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: bold;">
          ${t().labelReportTitle}
        </div>
        
        <div style="padding: 24px;">
          <div style="text-align: center; font-size: 24px; font-weight: bold; color: var(--color-text);">
            ${cropName} — ${cityName}
          </div>
          
          <div style="display: flex; gap: 14px; margin-top: 16px;">
            <div style="flex: 1; background: #E8F5E9; border-radius: 8px; padding: 12px; color: var(--color-text);">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted);">${t().labelOfficialMarket}</div>
              <div style="margin-top: 4px;"><span style="font-size: 14px; font-weight: 400;">Rs</span> <span style="font-size: 28px; font-weight: 800;">${data.marketPrice.toLocaleString()}</span></div>
              <div style="font-size: 11px; color: var(--color-muted);">${t().labelPer100kg}</div>
            </div>
            <div style="flex: 1; background: ${rightBoxBg}; border-radius: 8px; padding: 12px; color: var(--color-text);">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted);">${t().labelBuyerOffer}</div>
              <div style="margin-top: 4px;"><span style="font-size: 14px; font-weight: 400;">Rs</span> <span style="font-size: 28px; font-weight: 800;">${data.quotedPrice.toLocaleString()}</span></div>
              <div style="font-size: 11px; color: var(--color-muted);">${t().labelPer100kg}</div>
            </div>
          </div>
          
          <div style="width: 100%; text-align: center; font-size: 18px; font-weight: 700; color: ${headerColor}; margin-top: 20px;">
            ${statusText}
          </div>
          
          <div style="text-align: center; font-size: 14px; margin-top: 8px; color: ${diffColor};">
            ${diffLine}
          </div>
          
          <hr style="border: 0; border-top: 1px solid #E0E0E0; margin: 12px 0;">
          
          <div style="text-align: center; font-size: 12px; color: var(--color-muted);">
            ${t().labelSource}<br>${t().labelDataDate}
          </div>
          
          <div style="text-align: center; font-size: 10px; color: #BDBDBD; margin-top: 16px;">
            ${t().labelWatermark}
          </div>
        </div>
      </div>
      
      <div style="max-width: 400px; margin: 24px auto 0;">
        <button id="btn-share" style="width: 100%; height: 52px; background: #1565C0; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer;">
          ${t().btnShare}
        </button>
        <div id="share-msg" style="text-align: center; font-size: 12px; color: var(--color-muted); margin-top: 8px; display: none;">
          ${t().shareNotAvailable}
        </div>
        
        <button id="btn-screenshot" style="width: 100%; height: 52px; background: var(--color-text); color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px;">
          ${t().btnScreenshot}
        </button>
        
        <button id="btn-back-proof" style="display: block; text-align: center; font-size: 14px; color: var(--color-text); text-decoration: underline; background: none; border: none; cursor: pointer; width: 100%; padding: 16px; margin-top: 8px;">
          ${t().btnBackToResult}
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-back-proof").addEventListener("click", () => {
    showResultScreen(data);
  });

  document.getElementById("btn-share").addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t().labelReportTitle,
          text: `HarvestHonor Report for ${cropName} in ${cityName}. Market: Rs ${data.marketPrice}/100kg. Offered: Rs ${data.quotedPrice}/100kg.`,
          url: window.location.href
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      document.getElementById("share-msg").style.display = "block";
    }
  });

  // Edge Case 3: html2canvas fails
  document.getElementById("btn-screenshot").addEventListener("click", async () => {
    const btn = document.getElementById("btn-screenshot");
    const originalText = btn.textContent;
    btn.textContent = t().saving;
    btn.disabled = true;

    try {
      const element = document.getElementById("proof-card");
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#FFFFFF" 
      });
      const imgData = canvas.toDataURL("image/png");
      
      const link = document.createElement("a");
      link.download = `HarvestHonor-${data.crop}-${data.city}.png`;
      link.href = imgData;
      link.click();
      
      btn.textContent = originalText;
      btn.disabled = false;
    } catch (err) {
      console.error("Screenshot failed", err);
      btn.textContent = "Screenshot failed — try again";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    }
  });
}

function comparePrice(crop, city, quantity, quotedPrice) {
  const result = {
    crop: crop,
    city: city,
    quantity: quantity,
    quotedPrice: quotedPrice,
    marketPrice: null,
    percentageGap: null,
    rupeeDifference: null,
    verdict: null,
    confidenceLevel: null,
    confidenceLabel: null,
    error: null
  };

  if (typeof quantity !== 'number' || quantity <= 0 || 
      typeof quotedPrice !== 'number' || quotedPrice <= 0) {
    result.error = typeof t === 'function' ? t().errorInvalidQty : "Please enter a valid quantity and price.";
    return result;
  }

  const normCrop = typeof crop === 'string' ? crop.trim().toLowerCase() : "";
  const normCity = typeof city === 'string' ? city.trim().toLowerCase() : "";

  const pricesData = typeof priceData !== 'undefined' ? priceData : {};

  // Edge Case 1: Missing crop/city data
  if (!pricesData[normCrop]) {
    let errStr = typeof t === 'function' ? t().errorNoData : "Data not available for [crop] in [city]. Try a nearby city or check pbs.gov.pk directly.";
    result.error = errStr.replace("[crop]", crop).replace("[city]", city);
    return result;
  }

  const cityData = pricesData[normCrop][normCity];
  if (!cityData) {
    let errStr = typeof t === 'function' ? t().errorNoData : "Data not available for [crop] in [city]. Try a nearby city or check pbs.gov.pk directly.";
    result.error = errStr.replace("[crop]", crop).replace("[city]", city);
    return result;
  }

  result.marketPrice = cityData.price;
  result.confidenceLevel = cityData.confidence;

  const gap = ((quotedPrice - result.marketPrice) / result.marketPrice) * 100;
  result.percentageGap = Math.round(gap * 10) / 10;

  result.rupeeDifference = ((quotedPrice - result.marketPrice) / 100) * quantity;

  if (result.percentageGap < -10) {
    result.verdict = "underpaid";
  } else if (result.percentageGap > 10) {
    result.verdict = "above_market";
  } else {
    result.verdict = "fair";
  }

  return result;
}

function getActionOptions(verdict, confidenceLevel) {
  if (verdict === "underpaid" && confidenceLevel === "high") {
    return [
      "Try negotiating — show this result to the buyer",
      "Check another buyer nearby before deciding",
      "Wait 1 to 2 days if your crop allows it"
    ];
  }
  if (verdict === "underpaid" && confidenceLevel === "moderate") {
    return [
      "Verify the price at your local mandi first",
      "Ask other farmers in the area what they got",
      "Use this as a starting point only, not final answer"
    ];
  }
  if (verdict === "fair") {
    return [
      "Price is reasonable — you can proceed",
      "Ask if the buyer can go slightly higher",
      "Compare with one more buyer to be sure"
    ];
  }
  if (verdict === "above_market") {
    return [
      "This is a good offer — better than market rate",
      "Consider selling now before prices shift",
      "Confirm quantity and quality terms before agreeing"
    ];
  }
  
  return [
    "Check your inputs and try again",
    "Visit your local mandi for current prices",
    "Contact your nearest agriculture office"
  ];
}

function runTests() {
  console.log("--- RUNNING TESTS ---");
  const originalData = typeof priceData !== 'undefined' ? priceData : null;
  window.priceData = {
    "tomato": {
      "karachi": { "price": 3200, "confidence": "high" },
      "lahore": { "price": 4100, "confidence": "high" },
      "multan": { "price": 3800, "confidence": "moderate" }
    },
    "onion": {
      "karachi": { "price": 1800, "confidence": "high" },
      "lahore": { "price": 2100, "confidence": "high" }
    }
  };

  const tests = [
    {
      name: "1. A crop and city that exists — underpaid result",
      args: ["tomato", "karachi", 100, 2000],
      check: (res) => res.verdict === "underpaid" && res.error === null
    },
    {
      name: "2. A crop and city that exists — fair result",
      args: ["tomato", "karachi", 100, 3100],
      check: (res) => res.verdict === "fair" && res.error === null
    },
    {
      name: "3. A crop and city that exists — above market result",
      args: ["tomato", "karachi", 100, 4000],
      check: (res) => res.verdict === "above_market" && res.error === null
    },
    {
      name: "6. Quantity entered as 0",
      args: ["tomato", "karachi", 0, 3200],
      check: (res) => res.error !== null
    },
    {
      name: "7. QuotedPrice entered as 0",
      args: ["tomato", "karachi", 100, 0],
      check: (res) => res.error !== null
    },
    {
      name: "8. Inputs with extra spaces and uppercase letters",
      args: ["  Tomato  ", "  KARACHI  ", 100, 2000],
      check: (res) => res.verdict === "underpaid" && res.error === null
    }
  ];

  tests.forEach((t) => {
    console.log("\\nTesting: " + t.name);
    console.log("Inputs: crop=" + t.args[0] + ", city=" + t.args[1] + ", quantity=" + t.args[2] + ", quotedPrice=" + t.args[3]);
    const result = comparePrice(...t.args);
    console.log("Result object:", result);
    const passed = t.check(result);
    console.assert(passed, "Test failed: " + t.name);
    console.log(passed ? "✅ Passed" : "❌ Failed");
  });

  console.log("\\n--- TESTS COMPLETE ---");
  window.priceData = originalData;
}

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  runTests();
}
