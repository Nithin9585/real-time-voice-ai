import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchSimilarDocuments } from './vectorStore.js'; // Assuming this function returns relevant user messages from vector store
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Streaming response (simulated full text, since Gemini doesn't yet support token-level streaming like OpenAI)
export async function streamGeminiResponse(history, onTokenCallback) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Fetch the embedding of the last user message
    const lastUserMessage = history[history.length - 1]?.content || '';
    const embedding = await getGeminiEmbedding(lastUserMessage);

    // Fetch similar user messages from the vector store based on the embedding
    const userMessagesFromVectorStore = await searchSimilarDocuments(embedding);

    // Format the similar messages as part of the conversation history
    const userMessagesText = userMessagesFromVectorStore
      .map((msg) => `"${msg.content}"`) // Assuming msg contains the message text
      .join('\n');

    let emotion = '';
    try {
      const res = await axios.post('http://localhost:5000/detect-emotion', {
        text: lastUserMessage,
      });
      emotion = res.data.emotion || '';
      console.log('🎭 Detected emotion:', emotion);
    } catch (err) {
      console.warn('⚠️ Emotion detection failed:', err.message);
    }

    const styledPrompt = `
You are a thoughtful, funny, flirty, and empathetic assistant in a brief conversation with a human.

The user seems to be feeling: ${emotion}.

Here are the latest messages from the user:
${userMessagesText}

The human just said: "${lastUserMessage}"

Listen to their message and respond concisely in a natural, friendly tone, like a quick chat with someone you find interesting.

Give a warm, engaging, and friendly response that subtly acknowledges their emotional state (${emotion}). Feel free to add a tiny bit of playful flirtation or a very short follow-up question.

Keep your response extremely brief and ensure it contains absolutely no emojis or brackets of any kind. Aim for a very human-like reply.
    `.trim();

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(styledPrompt);
    const fullText = result.response.text();

    // Send the full response at once
    onTokenCallback(fullText);
    onTokenCallback('[__END__]');
  } catch (error) {
    console.error('❌ Gemini streaming error:', error.message);
    onTokenCallback('An error occurred while generating the response.');
  }
}


// Get summary for storing
export async function getGeminiSummary(history) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chatText = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `
Summarize the following conversation in 2-3 lines.
Make it clear, concise, and remember important personal details like birthdays, places, or emotions if mentioned.

Conversation:
${chatText}
    `.trim();

    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    console.log('📄 Summary generated:', summary);
    return summary;
  } catch (err) {
    console.error('❌ Error generating summary:', err.message);
    return '';
  }
}

// Generate embeddings for vector store
export async function getGeminiEmbedding(text) {
  try {
    const embedModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await embedModel.embedContent({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    });

    const embedding = result.embedding.values;
    console.log('📌 Got embedding vector of length:', embedding.length);
    return embedding;
  } catch (err) {
    console.error('❌ Error generating embedding:', err.message);
    return [];
  }
}
