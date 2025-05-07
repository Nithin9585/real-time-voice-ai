import { WebSocketServer } from 'ws';
import { streamGeminiResponse, getGeminiSummary, getGeminiEmbedding } from './services/gemini.js';
import { addDocument } from './services/vectorStore.js';

const sessions = new Map(); // In-memory session store

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('🟢 New WebSocket connection');
    sessions.set(ws, { history: [], user: null }); // Add user and history in the session

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data);
        const { message, type, user } = parsed;

        // Save user info during the connection initialization (first message)
        if (type === 'init' && user) {
          const session = sessions.get(ws);
          session.user = user; // Save user info in session
          sessions.set(ws, session);
          console.log('👤 User info set:', user.id);
          return;
        }

        if (type === 'end') {
          console.log('🔴 Session ended by client');
          return;
        }

        const session = sessions.get(ws);
        const history = session.history || [];
        history.push({ role: 'user', content: message });

        let fullResponse = '';
       
    const userId = session.user?.id; 

        await streamGeminiResponse(history, (token) => {
          ws.send(JSON.stringify({ partial: token }));
          if (token !== '[__END__]') fullResponse += token;
        },userId);

        history.push({ role: 'model', content: fullResponse });
        session.history = history;
        sessions.set(ws, session);

      } catch (error) {
        console.error('❌ WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Internal error occurred.' }));
      }
    });

    ws.on('close', async () => {
      console.log('❌ WebSocket client disconnected');

      const session = sessions.get(ws);
      const history = session.history;
  const userId = session.user?.id; 
  console.log('User ID:', userId);

      if (history && history.length) {
        const summary = await getGeminiSummary(history);
        const embedding = await getGeminiEmbedding(summary);

        await addDocument(summary, embedding,userId); 

        console.log('✅ Conversation summarized and stored in Supabase');
      }

      sessions.delete(ws);
    });
  });
}
