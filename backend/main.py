import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_engine import get_policy_answer
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="The People's Agent API")

# Setup Supabase Client for the Updates Feed
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define request format
class UserRequest(BaseModel):
    query: str

# CORS (Allow Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Online", "system": "The People's Agent"}

@app.get("/updates")
def get_updates():
    try:
        # Fetch the latest processed documents from Supabase
        # We query the 'vectors' table metadata directly
        response = supabase.table("vectors").select("metadata").limit(50).execute()
        
        seen_links = set()
        updates = []
        
        for row in response.data:
            meta = row.get('metadata', {})
            link = meta.get('pdf_link')
            if link and link not in seen_links:
                seen_links.add(link)
                updates.append({
                    "title": link.split('/')[-1].replace('%20', ' ').replace('.pdf', ''),
                    "url": link,
                    "date": "Recently Indexed" 
                })
                if len(updates) >= 5: break
        
        return {"updates": updates}
    except Exception as e:
        print(f"Error fetching updates: {e}")
        return {"updates": []}

@app.post("/chat")
def chat_endpoint(request: UserRequest):
    try:
        result = get_policy_answer(request.query)
        # Ensure we always return the same JSON structure
        if isinstance(result, dict):
             return {"status": "success", "answer": result["answer"], "sources": result["sources"]}
        else:
             return {"status": "success", "answer": str(result), "sources": []}
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))