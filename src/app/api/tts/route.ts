import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// TTS API — supports multiple providers
// Priority: ElevenLabs > Google Cloud TTS > Browser fallback
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, voice, provider } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // ElevenLabs
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey && (!provider || provider === "elevenlabs")) {
      const voiceId = voice || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text.substring(0, 5000), // ElevenLabs limit
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
            },
          }),
        }
      );

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
      // Fall through to next provider if ElevenLabs fails
    }

    // Google Cloud TTS
    const gcpKey = process.env.GOOGLE_TTS_API_KEY;
    if (gcpKey && (!provider || provider === "google")) {
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${gcpKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: text.substring(0, 5000) },
            voice: {
              languageCode: voice?.startsWith("he") ? "he-IL" : "en-US",
              name: voice || "en-US-Neural2-F",
            },
            audioConfig: { audioEncoding: "MP3" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const audioContent = Buffer.from(data.audioContent, "base64");
        return new NextResponse(audioContent, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    // No TTS provider available — signal client to use browser TTS
    return NextResponse.json(
      { fallback: "browser", message: "No TTS API key configured. Using browser speech synthesis." },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTS error" },
      { status: 500 }
    );
  }
}

// GET /api/tts — list available voices
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers: Array<{ provider: string; available: boolean; voices: Array<{ id: string; name: string }> }> = [];

  if (process.env.ELEVENLABS_API_KEY) {
    providers.push({
      provider: "elevenlabs",
      available: true,
      voices: [
        { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female)" },
        { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Male)" },
        { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female)" },
        { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Female)" },
        { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Male)" },
        { id: "VR6AewLTigWG4xSOukaG", name: "Arnold (Male)" },
      ],
    });
  }

  if (process.env.GOOGLE_TTS_API_KEY) {
    providers.push({
      provider: "google",
      available: true,
      voices: [
        { id: "en-US-Neural2-F", name: "US Female" },
        { id: "en-US-Neural2-D", name: "US Male" },
        { id: "en-GB-Neural2-A", name: "UK Female" },
        { id: "he-IL-Standard-A", name: "Hebrew Female" },
        { id: "he-IL-Standard-B", name: "Hebrew Male" },
      ],
    });
  }

  providers.push({
    provider: "browser",
    available: true,
    voices: [{ id: "default", name: "Browser Default" }],
  });

  return NextResponse.json({ providers });
}
