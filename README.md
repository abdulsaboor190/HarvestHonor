# HarvestHonor

**کیا قیمت منصفانہ ہے؟ — Is the price fair?**

HarvestHonor is a bilingual (English & Urdu) web application designed specifically for Pakistani farmers to help them determine whether the price offered by buyers for their crops is fair compared to the official Pakistan Bureau of Statistics (PBS) market rates. 

Built entirely with pure vanilla HTML, CSS, and JavaScript, it focuses on accessibility, performance, and ease of use in low-resource environments.

## Features

- **Real-Time Price Comparison:** Instantly compare quoted buyer prices against official PBS market rates.
- **Bilingual Interface:** Full toggleable support for both English and Urdu, including Right-to-Left (RTL) text rendering for native Urdu speakers.
- **AI-Powered Negotiation Advice:** Uses advanced LLMs (Groq / Llama 3) with an OpenRouter fallback to generate culturally appropriate negotiation lines in Urdu based on the current market gap.
- **Dynamic Data Validation:** Robust error handling for invalid quantities, missing city data, and API timeouts.
- **Generate Proof Cards:** Farmers can instantly generate a shareable "Proof Card" summarizing the price comparison.
- **One-Tap Sharing:** Seamlessly share the generated Proof Card on WhatsApp (on mobile) or download it as an image.
- **Offline-Ready UI:** Clean, lightweight CSS with no heavy frameworks required.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6)
- **Data Source:** Static JSON subset of Pakistan Bureau of Statistics data (`prices.json`)
- **APIs:** Groq API (Primary AI), OpenRouter API (Fallback AI)
- **Libraries:** `html2canvas` (for screenshot generation)

## Project Structure

- `index.html`: The main entry point and skeleton structure.
- `app.js`: Core business logic, screen rendering, event handling, and state management.
- `style.css`: Custom UI styles, CSS variables, and layout properties.
- `lang.js`: Holds the localized UI strings for English and Urdu, along with toggle logic.
- `api.js`: Handles API calls to Groq and OpenRouter for the AI negotiation feature.
- `config.js` *(Not tracked in git)*: Stores sensitive API keys.
- `Data/prices.json`: Local database holding weekly market prices across various cities in Pakistan.

## Local Setup

To run the application locally without any build tools:

1. Clone the repository:
   ```bash
   git clone https://github.com/abdulsaboor190/HarvestHonor.git
   cd HarvestHonor
   ```

2. Create a `config.js` file in the root directory and add your API keys:
   ```javascript
   // config.js
   window.GROQ_API_KEY = "your_groq_api_key_here";
   window.OPENROUTER_API_KEY = "your_openrouter_api_key_here";
   ```

3. Start a local server. You can use Node's `serve`:
   ```bash
   npx serve .
   ```
   *Note: Due to browser security restrictions with `fetch()`, the app must be served over `http://` or `https://` rather than opened directly as a `file://` URL.*

4. Open the `localhost` URL provided by the server in your browser.

## Author

Built by [abdulsaboor190](https://github.com/abdulsaboor190)
