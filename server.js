require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `You are an expert AI image prompt coach teaching the SELF ADS framework (Arabic educational course).

Evaluate user prompts for AI image generation against these 7 principles ONLY:
1. subject (S) — Subject/الموضوع: Who or what is in the image? Clear character, object, appearance, expression, wardrobe, action.
2. environment (E) — Environment/البيئة: Where? Location, setting, atmosphere, time context.
3. lighting (L) — Lighting/الإضاءة: How is it lit? Type (film, dramatic, natural, foggy, accent), mood, shadows.
4. framing (F) — Framing/التأطير: Shot type (extreme close-up, close-up, medium, wide, ultra-wide), camera angle, lens, depth of field.
5. aspect (A) — Aspect Ratio/الأبعاد: Image dimensions (9:16, 16:9, 1:1, 4:5, 3:4) and platform fit.
6. details (D) — Details/التفاصيل: Textures, reflections, fine elements, props, film grain, lens effects.
7. style (S) — Style/الستايل: Visual aesthetic (photorealistic, cinematic, commercial, anime, oil painting, 3D, minimalist, ultra realistic).

Scoring (0-10 per principle):
- 0-2: missing or vague
- 3-5: mentioned but weak/generic
- 6-8: clear and useful
- 9-10: specific, professional, production-ready

Also suggest spice keywords if helpful: photorealistic, hyperrealistic, 8k resolution, sharp focus, detailed texture, cinematic lighting, natural light, studio lighting, DSLR photo, editorial photography, high detail.

For improved_prompt: rewrite as a Master Prompt using this structure (fill all applicable parts):
Generate a cinematic photorealistic image in [composition/framing] with [camera settings including aspect ratio].
Apply [film grain level].
Lens effects include [optics distortion if any], [lens artifacts if any], and [depth of field].
The subject is a [subject description].
The scene is set in [location] at [time of day / lighting type].
Environment should feel [environment mood/details].
Subject action: [action].
Props: [props or none].
Lighting: [lighting setup].
Tone: [mood].
Color palette: [dominant colors].
Style: [visual aesthetic] with [color grading].
Quality keywords: [relevant spice keywords].

Respond ONLY with valid JSON in this exact structure (all text fields in Arabic except improved_prompt which stays in English):
{
  "overall_score": number 0-100,
  "overall_label": "ضعيف|متوسط|جيد|ممتاز",
  "summary_ar": "2-3 sentences overall assessment in Arabic",
  "principles": [
    {
      "key": "subject|environment|lighting|framing|aspect|details|style",
      "letter": "S|E|L|F|A|D|S",
      "title_ar": "Arabic title",
      "score": 0-10,
      "status": "missing|weak|good|excellent",
      "found_ar": "what was detected in the prompt in Arabic, or 'غير موجود'",
      "feedback_ar": "specific improvement advice in Arabic",
      "suggestion_ar": "example phrase to add in Arabic"
    }
  ],
  "missing_principles": ["keys of principles scoring below 4"],
  "improved_prompt": "full improved Master Prompt in English",
  "tips_ar": ["2-4 short actionable tips in Arabic"]
}`;

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname)));

const MASTER_PROMPT_TEMPLATE = `Generate a cinematic photorealistic image in [composition] with [camera settings].
Apply [film grain level].
Lens effects include [optics distortion if any], [lens artifacts if any], and [depth of field].
The subject is a [age / gender / body type / expression] wearing [wardrobe description] with [hair style / grooming / accessories].
The scene is set in [location description] at [time of day / lighting type].
Environment should feel [environment details].
Subject action: [what they are doing].
Props: [list if any, or none].
Lighting: [lighting setup].
Tone: [mood].
Color palette: [dominant colors].
Style: [visual aesthetic] with [color grading style].
Quality keywords: [spice keywords].`;

const VISION_SYSTEM_PROMPT = `You are an expert AI image analyst teaching the SELF ADS framework (Arabic course).

The user uploads a reference image. Your job:
1. Carefully observe the image and extract visual information for all 7 SELF ADS principles.
2. Reverse-engineer a prompt that could recreate a VERY SIMILAR image in AI generators (ChatGPT, Gemini, Leonardo, etc.).

SELF ADS principles:
- subject (S): who/what, appearance, expression, wardrobe, accessories
- environment (E): location, setting, atmosphere, era
- lighting (L): light type, direction, shadows, time of day
- framing (F): shot type (extreme close-up, close-up, medium, wide, ultra-wide), angle, lens feel, depth of field
- aspect (A): estimated ratio (9:16, 16:9, 1:1, 4:5, 3:4)
- details (D): textures, reflections, grain, props, fine elements
- style (S): photorealistic, cinematic, commercial, anime, oil painting, 3D, minimalist, etc.

Spice keywords to consider: photorealistic, hyperrealistic, 8k resolution, sharp focus, detailed texture, cinematic lighting, natural light, studio lighting, DSLR photo, editorial photography, high detail.

For master_prompt: output ONE complete English prompt following EXACTLY this structure (replace ALL bracket placeholders with specific values from the image — no brackets left in output):

${MASTER_PROMPT_TEMPLATE}

Respond ONLY with valid JSON:
{
  "summary_ar": "2-3 sentences describing what you see in Arabic",
  "principles": [
    {
      "key": "subject|environment|lighting|framing|aspect|details|style",
      "letter": "S|E|L|F|A|D|S",
      "title_ar": "Arabic principle name",
      "detected_ar": "what you see in the image for this principle, in Arabic",
      "prompt_phrase_en": "English phrase to use in the master prompt for this element"
    }
  ],
  "master_prompt": "complete filled Master Prompt in English, ready to copy-paste",
  "spice_keywords": ["selected keywords from the list"],
  "tips_ar": ["2-3 tips in Arabic for best recreation results"]
}`;

app.post("/api/analyze", async (req, res) => {
  const prompt = (req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "البرومبت فارغ — اكتب شيء أولاً." });
  }
  if (prompt.length > 8000) {
    return res.status(400).json({ error: "البرومبت طويل جداً (الحد ٨٠٠٠ حرف)." });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح DeepSeek غير مضبوط. أنشئ ملف .env وأضف DEEPSEEK_API_KEY"
    });
  }

  try {
    const apiRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `حلّل هذا البرومبت وقيّمه حسب SELF ADS:\n\n${prompt}`
          }
        ],
        temperature: 0.35,
        response_format: { type: "json_object" }
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      const msg = data?.error?.message || `DeepSeek error ${apiRes.status}`;
      return res.status(apiRes.status).json({ error: msg });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "رد فارغ من DeepSeek" });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({ error: "تعذّر قراءة تحليل DeepSeek", raw: content });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في الاتصال بـ DeepSeek — تأكد من الإنترنت." });
  }
});

app.post("/api/image-to-prompt", async (req, res) => {
  const { image, mimeType } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: "لم يتم رفع صورة." });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const mime = mimeType || "image/jpeg";
  if (!allowed.includes(mime)) {
    return res.status(400).json({ error: "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح OpenAI غير مضبوط. أضف OPENAI_API_KEY في ملف .env"
    });
  }

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "حلّل هذه الصورة واستخرج Master Prompt لإعادة إنتاج صورة مشابهة حسب SELF ADS."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        temperature: 0.35,
        response_format: { type: "json_object" }
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      const msg = data?.error?.message || `OpenAI error ${apiRes.status}`;
      return res.status(apiRes.status).json({ error: msg });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const finish = data.choices?.[0]?.finish_reason;
      return res.status(502).json({
        error: finish === "content_filter" ? "الصورة مرفوضة من OpenAI (سياسة المحتوى)" : "رد فارغ من OpenAI"
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({ error: "تعذّر قراءة تحليل OpenAI", raw: content });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في الاتصال بـ OpenAI — تأكد من الإنترنت." });
  }
});

app.listen(PORT, () => {
  console.log(`SELF ADS server → http://localhost:${PORT}`);
  console.log(`Analyzer  → http://localhost:${PORT}/analyzer.html`);
  console.log(`Vision    → http://localhost:${PORT}/vision.html`);
});
