import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from dotenv import load_dotenv
import re
from typing import Optional, List

load_dotenv()

# Security Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Integer, default=1)
    
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(Text)  # JSON string of sources
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="chat_history")


# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    
    @validator('username')
    def username_validator(cls, v):
        if len(v) < 3 or len(v) > 20:
            raise ValueError('Username must be between 3 and 20 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v
    
    @validator('password')
    def password_validator(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
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
    query: str
    
    @validator('query')
    def query_validator(cls, v):
        # Prevent SQL injection attempts
        dangerous_patterns = [
            r"(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b|\bEXEC\b|\bUNION\b)",
            r"(--|;|\/\*|\*\/|xp_|sp_)",
        ]
        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Invalid input detected')
        if len(v.strip()) == 0:
            raise ValueError('Query cannot be empty')
        if len(v) > 5000:
            raise ValueError('Query too long')
        return v


class ChatHistoryResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[List[str]]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# FastAPI App
app = FastAPI(title="The People's Agent API with Auth")
security = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
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
    return {"status": "Online", "system": "The People's Agent with Auth"}


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
    # Find user
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
    
    # Verify user exists and is active
    user = db.query(User).filter(User.id == int(user_id), User.is_active == 1).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Generate new tokens
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
        # Import RAG engine (from your existing code)
        from rag_engine import get_policy_answer
        
        # Get AI response
        result = get_policy_answer(message.query)
        
        # Save user message to history
        user_message = ChatHistory(
            user_id=current_user.id,
            role="user",
            content=message.query,
            timestamp=datetime.utcnow()
        )
        db.add(user_message)
        
        # Save assistant response to history
        import json
        assistant_message = ChatHistory(
            user_id=current_user.id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result.get("sources", [])),
            timestamp=datetime.utcnow()
        )
        db.add(assistant_message)
        
        db.commit()
        
        return {
            "status": "success",
            "answer": result["answer"],
            "sources": result.get("sources", [])
        }
    
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/history", response_model=List[ChatHistoryResponse])
def get_chat_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get chat history from last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    history = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.timestamp >= seven_days_ago
    ).order_by(ChatHistory.timestamp.desc()).limit(limit).all()
    
    # Parse sources JSON
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


@app.get("/updates")
def get_updates():
    # Your existing updates endpoint (no auth required)
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"updates": []}
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
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
                if len(updates) >= 5:
                    break
        
        return {"updates": updates}
    except Exception as e:
        print(f"Error fetching updates: {e}")
        return {"updates": []}