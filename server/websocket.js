// websocket.js
import { WebSocketServer } from 'ws';
import { streamGeminiResponse } from './services/gemini.js';

const sessions = new Map(); // In-memory session store

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('🟢 New WebSocket connection');
    sessions.set(ws, []); // Start empty chat history for this client

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data);
        const { message, type } = parsed;

        if (type === 'end') {
          console.log('🔴 Session ended by client');
          sessions.delete(ws); // Clean up memory
          return;
        }

        console.log('🗣️ Received:', message);

        const history = sessions.get(ws) || [];

        // Push the new user message
        history.push({ role: 'user', content: message });

        let fullResponse = '';

        // Stream Gemini response token by token
        await streamGeminiResponse(history, (token) => {
          ws.send(JSON.stringify({ partial: token }));
          if (token !== '[__END__]') fullResponse += token;
        });

        // Store model response in history
        history.push({ role: 'model', content: fullResponse });
        sessions.set(ws, history); // Save updated history

      } catch (error) {
        console.error('❌ WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Internal error occurred.' }));
      }
    });

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      sessions.delete(ws); // Cleanup on disconnect
    });
  });
}
