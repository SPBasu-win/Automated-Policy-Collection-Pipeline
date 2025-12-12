import os
import hashlib
import time
from functools import lru_cache
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.llms.gemini import Gemini
from llama_index.vector_stores.supabase import SupabaseVectorStore
import redis

load_dotenv()

# Redis connection for caching and rate limiting
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
except:
    redis_client = None
    print("⚠️  Redis not available - caching disabled")

DB_CONNECTION = os.getenv("DATABASE_URL")
if not DB_CONNECTION:
    raise ValueError("DATABASE_URL environment variable is required")


class RateLimiter:
    """Token bucket rate limiter with Redis backend"""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def is_allowed(self, user_id: str) -> tuple[bool, Optional[int]]:
        """Check if request is allowed. Returns (allowed, retry_after_seconds)"""
        if not redis_client:
            return True, None  # No rate limiting without Redis
        
        key = f"ratelimit:{user_id}"
        current_time = int(time.time())
        window_start = current_time - self.window_seconds
        
        try:
            # Remove old entries
            redis_client.zremrangebyscore(key, 0, window_start)
            
            # Count requests in current window
            request_count = redis_client.zcard(key)
            
            if request_count >= self.max_requests:
                # Get oldest request timestamp
                oldest = redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1]) + self.window_seconds - current_time
                    return False, max(1, retry_after)
                return False, self.window_seconds
            
            # Add current request
            redis_client.zadd(key, {str(current_time): current_time})
            redis_client.expire(key, self.window_seconds)
            
            return True, None
        except Exception as e:
            print(f"Rate limiter error: {e}")
            return True, None  # Fail open


class QueryCache:
    """Cache for LLM responses with Redis backend"""
    
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl_seconds = ttl_seconds
    
    def _get_cache_key(self, query: str) -> str:
        """Generate cache key from query"""
        return f"cache:{hashlib.sha256(query.lower().strip().encode()).hexdigest()}"
    
    def get(self, query: str) -> Optional[Dict]:
        """Get cached response"""
        if not redis_client:
            return None
        
        try:
            key = self._get_cache_key(query)
            cached = redis_client.get(key)
            if cached:
                import json
                return json.loads(cached)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None
    
    def set(self, query: str, response: Dict):
        """Cache response"""
        if not redis_client:
            return
        
        try:
            import json
            key = self._get_cache_key(query)
            redis_client.setex(key, self.ttl_seconds, json.dumps(response))
        except Exception as e:
            print(f"Cache set error: {e}")


# Initialize singletons
rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
query_cache = QueryCache(ttl_seconds=3600)

# Cache embedding model and vector store initialization
@lru_cache(maxsize=1)
def get_embed_model():
    """Cached embedding model"""
    return GeminiEmbedding(model_name="models/text-embedding-004")


@lru_cache(maxsize=1)
def get_llm():
    """Cached LLM instance with optimized settings"""
    return Gemini(
        model_name="gemini-2.5-flash",
        temperature=0.3,  # Lower for consistency
        max_output_tokens=512  # Limit response length
    )


@lru_cache(maxsize=1)
def get_vector_store():
    """Cached vector store connection"""
    return SupabaseVectorStore(
        postgres_connection_string=DB_CONNECTION,
        collection_name="vectors",
        dimension=768
    )


def get_policy_answer(query: str, user_id: str = "anonymous") -> Dict:
    """
    Enhanced RAG with rate limiting, caching, and optimizations
    
    Args:
        query: User query
        user_id: User identifier for rate limiting
    
    Returns:
        Dict with answer, sources, and metadata
    """
    
    # Rate limiting check
    allowed, retry_after = rate_limiter.is_allowed(user_id)
    if not allowed:
        return {
            "error": "Rate limit exceeded",
            "retry_after": retry_after,
            "answer": f"Too many requests. Please try again in {retry_after} seconds."
        }
    
    # Check cache
    cached_response = query_cache.get(query)
    if cached_response:
        cached_response["cached"] = True
        return cached_response
    
    print(f"🧠 Processing: {query}")
    start_time = time.time()
    
    try:
        # Use cached instances
        embed_model = get_embed_model()
        llm = get_llm()
        vector_store = get_vector_store()
        
        # Create index from vector store
        index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            embed_model=embed_model
        )
        
        # Optimized retrieval - reduce from 5 to 3 for speed
        retriever = index.as_retriever(similarity_top_k=3)
        nodes = retriever.retrieve(query)
        
        # Extract unique sources
        sources = []
        seen = set()
        for node in nodes:
            src = node.metadata.get('pdf_link') or node.metadata.get('source')
            if src and src not in seen and src != "Verified Document":
                sources.append(src)
                seen.add(src)
        
        # Query with optimized settings
        query_engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=3,
            response_mode="compact"  # More efficient than default
        )
        response = query_engine.query(query)
        
        elapsed = time.time() - start_time
        result = {
            "answer": str(response),
            "sources": sources,
            "query_time": round(elapsed, 2),
            "cached": False
        }
        
        # Cache successful response
        query_cache.set(query, result)
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "error": str(e),
            "answer": "An error occurred processing your request.",
            "sources": []
        }