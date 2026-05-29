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

// ── Access codes — add one per customer ─────────────────────────────
const VALID_CODES = new Set([
  "GLOW-STAR-0001",
  "GLOW-STAR-0002",
  "GLOW-STAR-0003",
  "GLOW-STAR-0004",
  "GLOW-STAR-0005",
]);

const USED_CODES = new Set();

// ── Verify access code ───────────────────────────────────────────────
app.post("/api/verify", (req, res) => {
  const { code } = req.body;
  const clean = (code || "").trim().toUpperCase();
  if (!VALID_CODES.has(clean)) return res.json({ ok: false, error: "Invalid access code. Please check and try again." });
  if (USED_CODES.has(clean)) return res.json({ ok: false, error: "This code has already been used." });
  USED_CODES.add(clean);
  res.json({ ok: true });
});

// ── Proxy to Google Gemini (keeps API key hidden) ────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = \https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${GEMINI_KEY}\`;`

const SYSTEM_PROMPT = `You are EtsyGlow, an expert Etsy SEO and listing audit assistant. Respond ONLY with a raw JSON object — no markdown, no backticks, no explanation before or after. Use exactly this structure:
{"overallScore":85,"verdict":"One encouraging sentence here.","categories":{"titles":{"score":90,"status":"Excellent","tip":"Specific tip here."},"keywords":{"score":78,"status":"Good","tip":"Specific tip here."},"photos":{"score":75,"status":"Good","tip":"Specific tip here."},"seo":{"score":72,"status":"Needs Work","tip":"Specific tip here."},"structure":{"score":80,"status":"Good","tip":"Specific tip here."}},"hurting":["Issue one","Issue two","Issue three"],"working":["Strength one","Strength two"],"improve":["Improvement one","Improvement two","Improvement three"],"doNotChange":["Keep this one","Keep this two"]}`;

app.post("/api/audit", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided." });
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EtsyGlow running on port ${PORT}`));
