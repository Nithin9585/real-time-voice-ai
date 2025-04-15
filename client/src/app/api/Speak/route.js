// /pages/api/speak.js

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

export async function POST(req) {
  // Parse the incoming request body
  const { text } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: 'Text input is required' }), {
      status: 400,
    });
  }

  try {
    // Call OpenAI's TTS API or another service to generate speech
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // You can use other voices like 'shimmer', 'echo', 'onyx', etc.
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Set response headers and return the audio file
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate speech' }),
      { status: 500 }
    );
  }
}
