import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/codegen — generate code using DeepSeek
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { prompt, language, framework } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        status: "placeholder",
        message: "DEEPSEEK_API_KEY not configured. Set it to enable code generation.",
        prompt,
        language,
        framework,
      });
    }

    const systemPrompt = `You are a code generator. Generate clean, production-ready code based on the user's request.
${language ? `Language: ${language}` : ""}
${framework ? `Framework: ${framework}` : ""}
Only output the code with brief comments. No explanations outside code blocks.`;

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `DeepSeek error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const code = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ code, model: "deepseek-chat", tokens: data.usage });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Code gen error" }, { status: 500 });
  }
}
