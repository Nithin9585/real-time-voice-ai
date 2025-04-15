// services/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function streamGeminiResponse(history, onTokenCallback) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Start a chat session using the full history
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    // Extract the latest user message for styling
    const lastUserMessage = history[history.length - 1]?.content || '';

    const styledPrompt = `
      You are a thoughtful, empathetic assistant having a conversation with a human. 
      You listen carefully to what they say and respond in a natural, conversational tone — like you're chatting with a friend or a helpful guide.

      The user just said:
      "${lastUserMessage}"

      Please respond in a warm, engaging, and friendly way — showing that you understood what they said. 
      Feel free to ask a follow-up question if it makes sense, or give advice, encouragement, or insight based on their message.
      Make sure it feels like a two-way conversation, not just data delivery.

      Avoid overly robotic or generic responses. Just be real, helpful, and human.
    `;

    const result = await chat.sendMessageStream(styledPrompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onTokenCallback(chunkText);
      }
    }

    onTokenCallback('[__END__]');
  } catch (error) {
    console.error('Gemini streaming error:', error);
    onTokenCallback('An error occurred while generating the response.');
  }
}
