import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
     You are a thoughtful, empathetic assistant having a conversation with a human. You listen carefully to what they say and respond in a natural, conversational tone — like you're chatting with a friend or a helpful guide.
     The user just said:
     "${message}"
     Please respond in a warm, engaging, and friendly way — showing that you understood what they said. Feel free to ask a follow-up question if it makes sense, or give advice, encouragement, or insight based on their message. Make sure it feels like a two-way conversation, not just data delivery.
     Avoid overly robotic or generic responses. Just be real, helpful, and human.`;
    const response = await model.generateContent(prompt);
    const text = response.response?.text();

    if (!text) {
      throw new Error("No text returned from Gemini API");
    }

    console.log("Received from voice:", message);
    console.log("Gemini reply:", text);

    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error("Error generating response:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
