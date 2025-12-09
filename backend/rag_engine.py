import os
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.llms.gemini import Gemini
from llama_index.vector_stores.supabase import SupabaseVectorStore

load_dotenv()

# --- FIX: HARDCODE THE CONNECTION STRING FOR NOW ---
# Replace this string with YOUR actual Supabase connection string (the one that worked in ingest.py)
DB_CONNECTION = "postgresql://postgres:swastikprasadbasu@db.uyjqsqqelvlqelkvhwpt.supabase.co:6543/postgres" 

def get_policy_answer(query: str):
    print(f"🧠 Thinking about: {query}")
    
    # 1. Setup Models
    embed_model = GeminiEmbedding(model_name="models/text-embedding-004")
    llm = Gemini(model_name="gemini-2.5-flash")

    # 2. Connect to DB (Now guaranteed to not be None)
    vector_store = SupabaseVectorStore(
        postgres_connection_string=DB_CONNECTION,
        collection_name="vectors",
        dimension=768 
    )

    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model
    )
    
    # 3. Retrieval
    retriever = index.as_retriever(similarity_top_k=5)
    nodes = retriever.retrieve(query)
    
    sources = []
    seen = set()
    for node in nodes:
        src = node.metadata.get('pdf_link') or node.metadata.get('source') or "Verified Document"
        if src not in seen and src != "Verified Document":
            sources.append(src)
            seen.add(src)

    # 4. Generation
    query_engine = index.as_query_engine(llm=llm)
    response = query_engine.query(query)
    
    return {
        "answer": str(response),
        "sources": sources
    }