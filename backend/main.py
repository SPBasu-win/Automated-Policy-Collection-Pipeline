import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator, Field
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import re
from typing import Optional, List
from contextlib import asynccontextmanager
import time

load_dotenv()

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Database Setup with connection pooling
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_login = Column(DateTime, index=True)
    is_active = Column(Integer, default=1)
    
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="chat_history")
    
    __table_args__ = (
        Index('idx_user_timestamp', 'user_id', 'timestamp'),
    )


# Create tables
Base.metadata.create_all(bind=engine)


# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=8)
    
    @validator('username')
    def username_validator(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v
    
    @validator('password')
    def password_validator(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    
    @validator('query')
    def query_validator(cls, v):
        # Prevent injection attempts
        dangerous_patterns = [
            r"(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b|\bEXEC\b|\bUNION\b)",
            r"(--|;|\/\*|\*\/|xp_|sp_)",
        ]
        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Invalid input detected')
        return v.strip()


class ChatHistoryResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[List[str]]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Request tracking middleware
class RateLimitMiddleware:
    """Simple in-memory rate limiting middleware"""
    def __init__(self):
        self.requests = {}
        
    async def __call__(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host
        
        # Clean old entries (simple cleanup)
        current_time = time.time()
        self.requests = {
            ip: times for ip, times in self.requests.items()
            if any(t > current_time - 60 for t in times)
        }
        
        # Check rate limit (100 requests per minute per IP)
        if client_ip in self.requests:
            recent_requests = [t for t in self.requests[client_ip] if t > current_time - 60]
            if len(recent_requests) >= 100:
                return JSONResponse(
                    status_code=429,
                    content={"error": "Too many requests. Please slow down."}
                )
            self.requests[client_ip] = recent_requests + [current_time]
        else:
            self.requests[client_ip] = [current_time]
        
        response = await call_next(request)
        return response


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 API Starting up...")
    yield
    # Shutdown
    print("👋 API Shutting down...")
    engine.dispose()


# FastAPI App
app = FastAPI(
    title="The People's Agent API",
    lifespan=lifespan
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Security Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str, token_type: str = "access"):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.id == int(user_id), User.is_active == 1).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# Routes
@app.get("/")
def home():
    return {"status": "Online", "system": "The People's Agent", "version": "2.0"}


@app.post("/auth/signup", response_model=Token)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or username already registered")
    
    # Create new user
    hashed_pw = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_pw,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(new_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@app.post("/auth/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@app.post("/auth/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = verify_token(refresh_token, token_type="refresh")
    user_id = payload.get("sub")
    
    user = db.query(User).filter(User.id == int(user_id), User.is_active == 1).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@app.get("/auth/profile", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/chat")
def chat_endpoint(
    message: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        from rag_engine import get_policy_answer
        
        # Pass user_id for rate limiting
        result = get_policy_answer(message.query, user_id=str(current_user.id))
        
        # Check for rate limit error
        if "error" in result and "Rate limit" in result.get("error", ""):
            raise HTTPException(
                status_code=429,
                detail={
                    "message": result["answer"],
                    "retry_after": result.get("retry_after", 60)
                }
            )
        
        # Save messages to history (batch insert for efficiency)
        import json
        messages = [
            ChatHistory(
                user_id=current_user.id,
                role="user",
                content=message.query,
                timestamp=datetime.utcnow()
            ),
            ChatHistory(
                user_id=current_user.id,
                role="assistant",
                content=result["answer"],
                sources=json.dumps(result.get("sources", [])),
                timestamp=datetime.utcnow()
            )
        ]
        db.bulk_save_objects(messages)
        db.commit()
        
        return {
            "status": "success",
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "cached": result.get("cached", False),
            "query_time": result.get("query_time")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/chat/history", response_model=List[ChatHistoryResponse])
def get_chat_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    history = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.timestamp >= seven_days_ago
    ).order_by(ChatHistory.timestamp.desc()).limit(limit).all()
    
    import json
    for msg in history:
        if msg.sources:
            try:
                msg.sources = json.loads(msg.sources)
            except:
                msg.sources = []
    
    return history


@app.delete("/chat/history")
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete()
    db.commit()
    return {"status": "success", "message": "Chat history cleared"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test DB connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}