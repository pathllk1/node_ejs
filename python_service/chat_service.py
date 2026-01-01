import os
import json
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load the API Key
load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")

# Setup the OpenRouter Client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
)

# Create a router for chat endpoints
router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    history: List[Message]  # Previous chat context
    message: str           # The new user message

@router.post("/chat")
def chat_endpoint(data: ChatInput):
    try:
        # Build the conversation history for the AI
        # Start with a System Prompt to define personality
        messages = [
            {"role": "system", "content": "You are a helpful, witty, and concise AI assistant named 'Imagination'."}
        ]
        
        # Add previous history (if any)
        for msg in data.history:
            messages.append({"role": msg.role, "content": msg.content})

        # Add the current new message
        messages.append({"role": "user", "content": data.message})

        # Call OpenRouter
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