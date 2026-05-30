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
  "GLOW-STAR-0001","GLOW-STAR-0002","GLOW-STAR-0003","GLOW-STAR-0004","GLOW-STAR-0005",
  "GLOW-TEST-0001","GLOW-TEST-0002","GLOW-TEST-0003",
  "GLOW-MOON-0001","GLOW-MOON-0002","GLOW-MOON-0003"
]);
const USED_CODES = new Set();

app.post("/api/verify", (req, res) => {
  const { code } = req.body;
  const clean = (code || "").trim().toUpperCase();
  if (!VALID_CODES.has(clean)) return res.json({ ok: false, error: "Invalid access code." });
  if (USED_CODES.has(clean)) return res.json({ ok: false, error: "Code already used." });
  USED_CODES.add(clean);
  res.json({ ok: true });
});

const SYSTEM_PROMPT = "You are EtsyGlow, an expert Etsy SEO and listing audit assistant. Respond ONLY with a raw JSON object, no markdown, no backticks. Use exactly this structure: {\"overallScore\":85,\"verdict\":\"One encouraging sentence.\",\"categories\":{\"titles\":{\"score\":90,\"status\":\"Excellent\",\"tip\":\"tip here\"},\"keywords\":{\"score\":78,\"status\":\"Good\",\"tip\":\"tip here\"},\"photos\":{\"score\":75,\"status\":\"Good\",\"tip\":\"tip here\"},\"seo\":{\"score\":72,\"status\":\"Needs Work\",\"tip\":\"tip here\"},\"structure\":{\"score\":80,\"status\":\"Good\",\"tip\":\"tip here\"}},\"hurting\":[\"Problem — try: rewrite\"],\"working\":[\"Strength\"],\"improve\":[\"Improve — try: example\"],\"doNotChange\":[\"Keep this\"]}";

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
        model: "mistralai/mistral-7b-instruct:free",

        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
text = text.replace(/```json/g, "").replace(/```/g, "").trim();
const match = text.match(/\{[\s\S]*\}/);
if (match) text = match[0];
res.json({ text });


  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EtsyGlow running on port ${PORT}`));
