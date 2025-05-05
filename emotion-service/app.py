# filename: app.py
from fastapi import FastAPI, Request
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

pipe = pipeline("text-classification", model="nateraw/bert-base-uncased-emotion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect-emotion")
async def detect_emotion(request: Request):
    data = await request.json()
    text = data.get("text")
    result = pipe(text, top_k=1)[0]
    print('emotion detected and emotion score :', result["label"],result["score"])
    return {"emotion": result["label"], "score": result["score"]}
