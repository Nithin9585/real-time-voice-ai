import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/GenerateResponse", async (req, res) => {
  try {
    console.log("Api key : ", process.env.GEMINI_API_KEY);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a thoughtful, empathetic assistant having a conversation with a human. You listen carefully to what they say and respond in a natural, conversational tone — like you're chatting with a friend or a helpful guide.
      The user just said:
      "${message}"
      Please respond in a warm, engaging, and friendly way — showing that you understood what they said. Feel free to ask a follow-up question if it makes sense, or give advice, encouragement, or insight based on their message. Make sure it feels like a two-way conversation, not just data delivery.
      Avoid overly robotic or generic responses. Just be real, helpful, and human.
    `;

    const response = await model.generateContent(prompt);
    const text = response.response?.text(); 
    if (!text) {
      throw new Error("No text returned from Gemini API");
    }

    console.log("Received from client:", message);
    console.log("Gemini reply:", text);

    res.json({ reply: text });

  } catch (e) {
    console.error("Error generating response:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
