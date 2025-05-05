export const POST = async (request) => {
  try {
    const {
      text,
      target_language_code = "hi-IN",
      speaker: requestedSpeaker = "meera",
    } = await request.json();

    if (!text || text.trim() === "") {
      return new Response(JSON.stringify({ error: "Text must not be empty." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    
    const speaker =  "Anushka";

    if (!process.env.SARVAM_API_KEY) {
      return new Response(JSON.stringify({ error: "API key is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sarvamResponse = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code,
        speaker,
        model: "bulbul:v2",
        speech_sample_rate: 8000,
        enable_preprocessing: true,
      }),
    });

    if (!sarvamResponse.ok) {
      const errorText = await sarvamResponse.text();
      console.error("Sarvam TTS API error:", errorText);
      return new Response(
        JSON.stringify({ error: "TTS API error", details: errorText }),
        {
          status: sarvamResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const sarvamData = await sarvamResponse.json();

    if (!sarvamData.audios || !sarvamData.audios[0]) {
      return new Response(
        JSON.stringify({ error: "No audio received from Sarvam API" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const base64Audio = sarvamData.audios[0];

    return new Response(
      JSON.stringify({ audio: base64Audio }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in TTS route:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
