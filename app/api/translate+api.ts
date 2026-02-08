import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { text, targetLang, image } = await req.json();

    if (!targetLang) {
      return Response.json({ error: "Missing targetLang" }, { status: 400 });
    }

    /**
     * =====================
     * 🖼️ 图片翻译（OCR + 翻译）
     * =====================
     */
    if (image) {
      // ✅ 关键修复：去掉 data:image/...;base64,
      const cleanBase64Image = image.includes("base64,")
        ? image.split("base64,")[1]
        : image;

      const prompt = `
You are a professional translation engine.

Task:
1. Read all text in the image.
2. Translate it into the target language.
3. Keep original meaning.
4. Do NOT add explanations.
5. Output ONLY the translated text.

Target language:
${targetLang}
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64Image,
                },
              },
            ],
          },
        ],
      });

      const translatedText = response.text?.trim();

      if (!translatedText) {
        throw new Error("Empty image translation result");
      }

      return Response.json({ text: translatedText });
    }

    /**
     * =====================
     * ✍️ 纯文本翻译
     * =====================
     */
    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const prompt = `
You are a professional translation engine.

Task:
- Translate the given text into the target language.
- Keep original meaning.
- Do NOT add explanations.
- Output ONLY the translated text.

Target language:
${targetLang}

Text:
${text}
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const translatedText = response.text?.trim();

    if (!translatedText) {
      throw new Error("Empty translation result");
    }

    return Response.json({ text: translatedText });
  } catch (error) {
    console.error("❌ Translation error:", error);
    return Response.json({ error: "Translation failed" }, { status: 500 });
  }
}
