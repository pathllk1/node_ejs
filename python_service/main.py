import os
import json
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load the API Key
load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")

# 2. Setup the OpenRouter Client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
)

app = FastAPI()

class DataInput(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"status": "Python AI Service is Running"}

# 1. New Data Structure: We accept a list of messages
class Message(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    history: List[Message] # Previous chat context
    message: str           # The new user message

@app.post("/chat")
def chat_endpoint(data: ChatInput):
    try:
        # 2. Build the conversation history for the AI
        # Start with a System Prompt to define personality
        messages = [
            {"role": "system", "content": "You are a helpful, witty, and concise AI assistant named 'Imagination'."}
        ]
        
        # Add previous history (if any)
        for msg in data.history:
            messages.append({"role": msg.role, "content": msg.content})

        # Add the current new message
        messages.append({"role": "user", "content": data.message})

        # 3. Call OpenRouter
        response = client.chat.completions.create(
            model="kwaipilot/kat-coder-pro:free",
            messages=messages
        )

        bot_reply = response.choices[0].message.content

        return {
            "reply": bot_reply,
            "success": True
        }

    except Exception as e:
        print(f"Chat Error: {e}")
        return {"reply": "I lost my train of thought. (Error)", "success": False}

@app.post("/analyze")
def analyze_text(data: DataInput):
    # 3. Construct the Prompt
    # We force the model to be a "JSON machine"
    system_prompt = """
    You are an API that analyzes sentiment. 
    You MUST respond with valid JSON only. No markdown, no explanations.
    Format:
    {
        "analysis_result": "Positive" | "Negative" | "Neutral",
        "confidence_score": 0.0 to 1.0,
        "summary": "A 5-word summary of the text"
    }
    """

    try:
        # 4. Call OpenRouter
        response = client.chat.completions.create(
            model="kwaipilot/kat-coder-pro:free", # Your chosen model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this text: {data.text}"}
            ]
        )

        # 5. Parse the AI's response
        raw_content = response.choices[0].message.content.strip()
        
        # Sometimes models wrap JSON in ```json ... ```. We clean that.
        if raw_content.startswith("```"):
            raw_content = raw_content.strip("`").replace("json", "").strip()

        ai_data = json.loads(raw_content)

        # 6. Return to Node.js
        return {
            "analysis_result": ai_data.get("analysis_result", "Neutral"),
            "confidence_score": ai_data.get("confidence_score", 0.5),
            "original_text": data.text
        }

    except Exception as e:
        print(f"AI Error: {e}")
        # Fallback in case the AI fails or produces bad JSON
        return {
            "analysis_result": "Error",
            "confidence_score": 0.0,
            "original_text": data.text
        }