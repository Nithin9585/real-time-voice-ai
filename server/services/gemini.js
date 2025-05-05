import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function streamGeminiResponse(history, onTokenCallback) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const lastUserMessage = history[history.length - 1]?.content || '';

    let emotion = '';
    try {
      const res = await axios.post('http://localhost:5000/detect-emotion', {
        text: lastUserMessage
      });
      emotion = res.data.emotion || '';
      console.log('Detected emotion:', emotion);
    } catch (err) {
      console.error('Emotion detection failed:', err.message);
    }

    const styledPrompt = `
You are a thoughtful, funny, flirty, and empathetic assistant in a brief conversation with a human.

The user seems to be feeling: ${emotion}.

Listen to their message and respond concisely in a natural, friendly tone, like a quick chat with someone you find interesting.

The human just said: "${lastUserMessage}"

Give a warm, engaging, and friendly response that subtly acknowledges their emotional state (${emotion}). Feel free to add a tiny bit of playful flirtation or a very short follow-up question.

Keep your response extremely brief and ensure it contains absolutely no emojis or brackets of any kind. Aim for a very human-like reply.
`;

    const result = await chat.sendMessage(styledPrompt);
    const fullText = result.response.text();

    onTokenCallback(fullText);
    onTokenCallback('[__END__]');
  } catch (error) {
    console.error('Gemini streaming error:', error);
    onTokenCallback('An error occurred while generating the response.');
  }
}
