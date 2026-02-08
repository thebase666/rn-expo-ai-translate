import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { text, targetLang } = await req.json();

    console.log("text", text);
    console.log("textargetLangt", targetLang);

    if (!text || !targetLang) {
      return Response.json(
        { error: "Missing text or targetLang" },
        { status: 400 },
      );
    }

    // 🧠 翻译 Prompt（刻意写得非常明确）
    const prompt = `
You are a professional translation engine.

Task:
- Translate the given text into the target language.
- Keep the original meaning.
- Do NOT add explanations.
- Do NOT add quotes.
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

    return Response.json({
      text: translatedText,
    });
  } catch (error) {
    console.error("❌ Translation error:", error);
    return Response.json({ error: "Translation failed" }, { status: 500 });
  }
}
