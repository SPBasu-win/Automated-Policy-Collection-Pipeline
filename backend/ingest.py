print("1. Python is running...")
import os
print("2. Imports starting...")
from dotenv import load_dotenv
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.vector_stores.supabase import SupabaseVectorStore
from supabase import create_client


load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DB_CONNECTION = f"postgresql://postgres:swastikprasadbasu@db.uyjqsqqelvlqelkvhwpt.supabase.co:6543/postgres"

def ingest_data():
    print("🚀 Starting Ingestion Process...")

   
    embed_model = GeminiEmbedding(model_name="models/text-embedding-004")

    
    print("DEBUG: connecting to Supabase Vector Store...")
    vector_store = SupabaseVectorStore(
        postgres_connection_string=DB_CONNECTION,
        collection_name="vectors",
        dimension=768 
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

   
    print("📂 Reading files from 'data' folder...")
    documents = SimpleDirectoryReader("./data").load_data()
    print(f"📄 Found {len(documents)} document chunks.")

    
    print("🧠 Generating Embeddings and uploading to Supabase...")
    
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        embed_model=embed_model
    )

    print("✅ Ingestion Complete! Your AI now knows the policy.")

if __name__ == "__main__":
    ingest_data()