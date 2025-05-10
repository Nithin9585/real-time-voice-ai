#  Real-Time Voice AI



---

##  Tech Stack

### Frontend (Client)
- **Next.js** – React framework for server-side rendering and routing
- **JavaScript / React** – UI development
- **PostCSS** – Styling tools pipeline
- **WebSockets** – Real-time communication with the backend

### Backend (Server)
- **Node.js** – JavaScript runtime
- **Express.js** – Web framework for building REST APIs
- **WebSocket (ws)** – Real-time communication support
- **Redis** – In-memory data store for pub/sub or caching
- **RAG (Retrieval-Augmented Generation)** – AI-enhanced query handling (based on `rag/` and `rag.txt`)

### Emotion Detection Service
- **Python** – Backend language for ML
- **Flask or FastAPI**  – Lightweight web framework (used in `app.py`)
- **Machine Learning** – For real-time emotion detection from audio

### Tooling & DevOps
- **Shell Scripts** – `start.sh` and `stop.sh` to manage services
- **Virtualenv** – Python environment management
- **Node Package Manager (npm)** – Dependency management


---

##project sstructure 
```

real-time-voice-ai/
├── client/               # Frontend (Next.js)
│   ├── components/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   ├── middleware.js
│   ├── next.config.mjs
│   ├── postcss.config.mjs
│   ├── public/
│   ├── src/
│   ├── utils/
│   ├── eslint.config.mjs
│   ├── jsconfig.json
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
│
├── server/               # Backend (Node.js/Express)
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── rag/              # Likely related to retrieval-augmented generation
│   ├── websocket.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── emotion-service/      # Emotion detection (Python)
│   ├── __pycache__/
│   ├── app.py
│   ├── requirements.txt
│   └── venv/             # Python virtual environment
│
├── redis/                # Possibly for Redis config or data
│   └── (contents unknown — you can clarify)
│
├── scripts/              # Automation scripts
│   ├── start.sh
│   └── stop.sh
│
├── rag.txt               # Possibly reference data for RAG
├── README.md             # Project documentation
```


