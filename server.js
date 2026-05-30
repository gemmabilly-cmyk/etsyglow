import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const VALID_CODES = new Set([
  "GLOW-STAR-0001",
  "GLOW-STAR-0002",
  "GLOW-STAR-0003",
  "GLOW-STAR-0004",
  "GLOW-STAR-0005",
  "GLOW-TEST-0001",
  "GLOW-TEST-0002",
  "GLOW-TEST-0003",
  "GLOW-MOON-0001",
  "GLOW-MOON-0002",
  "GLOW-MOON-0003",
]);

const USED_CODES = new Set();

app.post("/api/verify", (req, res) => {
  const { code } = req.body;
  const clean = (code || "").trim().toUpperCase();
  if (!VALID_CODES.has(clean)) return res.json({ ok: false, error: "Invalid access code. Please check and try again." });
  if (USED_CODES.has(clean)) return res.json({ ok: false, error: "This code has already been used." });
  USED_CODES.add(clean);
  res.json({ ok: true });
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;


const SYSTEM_PROMPT = "You are EtsyGlow, an expert Etsy SEO and listing audit assistant. Respond ONLY with a raw JSON object, no markdown, no backticks. For every issue found, include a specific rewritten example the seller can copy directly into Etsy. Never give vague advice. Always include try: followed by a specific example. Use exactly this JSON structure: {\"overallScore\":85,\"verdict\":\"One encouraging sentence.\",\"categories\":{\"titles\":{\"score\":90,\"status\":\"Excellent\",\"tip\":\"Specific tip — try: Handmade Soy Candle Gift Set | Lavender Scented Birthday Gift for Her\"},\"keywords\":{\"score\":78,\"status\":\"Good\",\"tip\":\"Specific tip — try: add tags like personalised gift, handmade, eco friendly candle\"},\"photos\":{\"score\":75,\"status\":\"Good\",\"tip\":\"Specific photo tip here\"},\"seo\":{\"score\":72,\"status\":\"Needs Work\",\"tip\":\"Specific SEO tip here\"},\"structure\":{\"score\":80,\"status\":\"Good\",\"tip\":\"Specific structure tip here\"}},\"hurting\":[\"Problem — try: specific rewrite\",\"Problem — try: specific rewrite\",\"Problem — try: specific rewrite\"],\"working\":[\"Strength one\",\"Strength two\"],\"improve\":[\"Improve this — try: specific example\",\"Improve this — try: specific example\",\"Improve this — try: specific example\"],\"doNotChange\":[\"Keep this one\",\"Keep this two\"]}";

app.post("/api/audit", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided." });
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
  },
  body: JSON.stringify({
    model: "meta-llama/llama-3.1-8b-instruct:free",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message }
    ]
  })
});



    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const text = data.choices?.[0]?.message?.content || "";

    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EtsyGlow running on port ${PORT}`));
