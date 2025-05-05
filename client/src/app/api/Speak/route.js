// app/api/tts/route.js

export const POST = async (request) => {
  try {
    const body = await request.json();
    const { text, voice_id } = body;

    if (!text || !voice_id) {
      return new Response(JSON.stringify({ error: "Missing text or voice_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();
      console.error("ElevenLabs error:", errorText);
      return new Response(JSON.stringify({ error: "TTS failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await elevenResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline; filename=voice.mp3",
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
