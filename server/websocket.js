import { WebSocketServer } from 'ws';
import { streamGeminiResponse, getGeminiSummary, getGeminiEmbedding } from './services/gemini.js';
import { addDocument } from './services/vectorStore.js'; 
import { v4 as uuidv4 } from 'uuid';

const sessions = new Map(); // In-memory session store

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('🟢 New WebSocket connection');
    sessions.set(ws, []);

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data);
        const { message, type } = parsed;

        if (type === 'end') {
          console.log('🔴 Session ended by client');
          return;
        }

        const history = sessions.get(ws) || [];
        history.push({ role: 'user', content: message });

        let fullResponse = '';

        await streamGeminiResponse(history, (token) => {
          ws.send(JSON.stringify({ partial: token }));
          if (token !== '[__END__]') fullResponse += token;
        });

        history.push({ role: 'model', content: fullResponse });
        sessions.set(ws, history);

      } catch (error) {
        console.error('❌ WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Internal error occurred.' }));
      }
    });

    ws.on('close', async () => {
      console.log('❌ WebSocket client disconnected');

      const history = sessions.get(ws);
      if (history && history.length) {
        const summary = await getGeminiSummary(history);
        const embedding = await getGeminiEmbedding(summary);

        await addDocument(summary, embedding); // ✅ Store in Supabase

        console.log('✅ Conversation summarized and stored in Supabase');
      }

      sessions.delete(ws);
    });
  });
}
