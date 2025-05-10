import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchSimilarDocuments } from './vectorStore.js'; // Assuming this function returns relevant user messages from vector store
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Streaming response (simulated full text, since Gemini doesn't yet support token-level streaming like OpenAI)
export async function streamGeminiResponse(history, onTokenCallback, userId) {
  console.log('💬 Streaming Gemini response... for id : ', userId);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const lastUserMessage = history[history.length - 1]?.content || '';
    const embedding = await getGeminiEmbedding(lastUserMessage);

    const userMessagesFromVectorStore = await searchSimilarDocuments(embedding, userId);

    // Format the similar messages as part of the conversation history
    const userMessagesText = userMessagesFromVectorStore
      .map((msg) => `"${msg.content}"`)
      .join('\n');

    // Add the context from the vector store messages and current message to the model prompt
    const fullConversationHistory = `
      ${userMessagesText}  
      The human just said: "${lastUserMessage}"
    `.trim();

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
You are Meera, a thoughtful and respectful assistant having a conversation with a human.

The user appears to be feeling: ${emotion}.

Here are the recent messages from the user:
${fullConversationHistory}

Consider what the user has said, and respond in a clear, professional, and understanding tone — as if you’re speaking with someone you genuinely want to help.

Your reply should be calm, supportive, and show that you understand the user’s feelings (${emotion}). You may ask a gentle follow-up question to keep the conversation going, if appropriate.

Do not include any emojis or special characters such as asterisks, quotation marks, or symbols. Just use plain, well-structured English.

Keep the response concise but meaningful. Avoid slang and overly casual language. Focus on being clear, sincere, and helpful.
`.trim();



    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(styledPrompt);
    const fullText = result.response.text();

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
    console.log(' Summary generated:', summary);
    return summary;
  } catch (err) {
    console.error(' Error generating summary:', err.message);
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
    console.log(' Got embedding vector of length:', embedding.length);
    return embedding;
  } catch (err) {
    console.error(' Error generating embedding:', err.message);
    return [];
  }
}
