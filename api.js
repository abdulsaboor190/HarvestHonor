// Check if keys are defined in config.js globally, else fallback to placeholders
const GROQ_API_KEY = typeof window.GROQ_API_KEY !== 'undefined' ? window.GROQ_API_KEY : "your_groq_key_here";
const OPENROUTER_API_KEY = typeof window.OPENROUTER_API_KEY !== 'undefined' ? window.OPENROUTER_API_KEY : "your_openrouter_key_here";

function buildAIPrompt(crop, city, marketPrice, quotedPrice, percentageGap, verdict) {
  const belowAbove = percentageGap < 0 ? "below" : "above";
  const lowerHigher = percentageGap < 0 ? "lower" : "higher";
  const absGap = Math.abs(percentageGap);
  
  return `A farmer in ${city}, Pakistan brought ${crop} to sell today. 
The current official market price from the Pakistan Bureau of Statistics is Rs ${marketPrice} per 100kg.
The buyer offered Rs ${quotedPrice} per 100kg, which is ${absGap}% ${belowAbove} the official market rate.
Verdict: ${verdict}

Your job is to return ONLY a raw JSON object — no markdown, no backticks, no explanation, nothing else.

The JSON must have exactly these two fields:

urdu_line: One sentence in simple everyday Urdu that this farmer can say out loud to the buyer right now to negotiate. It must:
- Mention the official PBS price specifically
- Sound confident but respectful
- Be something a rural Pakistani farmer would actually say, not formal language
- Be a maximum of 25 words in Urdu

explanation: One sentence in simple English explaining a practical reason why the price might be ${lowerHigher} than market rate right now. Consider: seasonal harvest timing, regional oversupply, transportation costs, or local demand. Keep it under 20 words. No jargon.

Return only the raw JSON. Nothing before it. Nothing after it.`;
}

async function callGroq(promptString) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_API_KEY
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: promptString
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API returned status ${response.status}`);
  }

  const data = await response.json();
  let text = data.choices[0].message.content;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return text;
}

async function callOpenRouter(promptString) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "HTTP-Referer": "http://localhost",
      "X-Title": "HarvestHonor"
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        {
          role: "user", 
          content: promptString
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API returned status ${response.status}`);
  }

  const data = await response.json();
  let text = data.choices[0].message.content;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return text;
}

async function getAIVerdict(crop, city, marketPrice, quotedPrice, percentageGap, verdict) {
  const promptString = buildAIPrompt(crop, city, marketPrice, quotedPrice, percentageGap, verdict);
  
  try {
    try {
      const groqResponse = await callGroq(promptString);
      const parsed = JSON.parse(groqResponse);
      parsed.isFallback = false;
      return parsed;
    } catch (groqErr) {
      console.log("Groq failed, trying OpenRouter...");
      const orResponse = await callOpenRouter(promptString);
      const parsed = JSON.parse(orResponse);
      parsed.isFallback = false;
      return parsed;
    }
  } catch (err) {
    return {
      urdu_line: "سرکاری ریکارڈ کے مطابق یہ قیمت بازار سسے کم ہے — براہ کرم دوبارہ غور کریں۔",
      explanation: "AI explanation unavailable. The price comparison above is still accurate and based on official PBS data.",
      isFallback: true
    };
  }
}
