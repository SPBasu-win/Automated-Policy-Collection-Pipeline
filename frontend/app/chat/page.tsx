"use client";
import { useState, useRef, useEffect } from "react";
import { Send, StopCircle, User, Bot, History, Clock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

const TypingText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      setDisplay(text.slice(0, i));
      i++;
      if (i > text.length) {
        clearInterval(timer);
        setShowCursor(false);
      }
    }, 8);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span className="inline-block animate-fadeIn">
      {display}
      {showCursor && <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />}
    </span>
  );
};

export default function ChatPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "I am The People's Agent. I have access to the federal policy database.", 
      sources: [],
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !token) {
      router.push("/auth");
      return;
    }
    loadChatHistory();
  }, [user, token, router]);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const loadChatHistory = async () => {
    if (!token) return;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/chat/history", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const history = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sources: msg.sources || [],
          timestamp: new Date(msg.timestamp)
        }));
        setChatHistory(history.reverse());
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const send = async () => {
    if (!input.trim() || !token) return;
    
    const userMsg: Message = { 
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query: userMsg.content }),
      });
      
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.answer, 
        sources: data.sources,
        timestamp: new Date()
      }]);
      
      await loadChatHistory();
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error connecting to secure backend.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryIntoChat = (historyMessages: Message[]) => {
    setMessages([
      { 
        role: "assistant", 
        content: "I am The People's Agent. I have access to the federal policy database.", 
        sources: [],
        timestamp: new Date()
      },
      ...historyMessages
    ]);
    setShowHistory(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar - Chat History */}
      {showHistory && (
        <div className="w-80 border-r border-zinc-800 bg-zinc-900 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4" />
              Chat History (Last 7 Days)
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {chatHistory.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No chat history yet</p>
            ) : (
              chatHistory.map((msg, idx) => (
                <div 
                  key={msg.id || idx}
                  className="p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-all hover:shadow-lg transform hover:scale-[1.02]"
                  onClick={() => {
                    const start = Math.max(0, idx - 5);
                    const end = Math.min(chatHistory.length, idx + 6);
                    loadHistoryIntoChat(chatHistory.slice(start, end));
                  }}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {msg.role === "user" ? (
                      <User className="w-3 h-3 text-zinc-400 mt-1" />
                    ) : (
                      <Bot className="w-3 h-3 text-blue-400 mt-1" />
                    )}
                    <p className="text-xs text-zinc-300 line-clamp-2">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">The People's Agent</span>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all flex items-center gap-2 hover:shadow-lg transform hover:scale-105"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} animate-fadeIn`}>
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                  m.role === "user" ? "bg-zinc-800" : "bg-blue-700"
                }`}>
                  {m.role === "user" ? <User size={16} className="text-zinc-400" /> : <Bot size={16} className="text-white" />}
                </div>
                
                <div className="flex-1 max-w-[85%]">
                  <div className={`rounded-lg px-4 py-2 text-sm leading-7 ${
                    m.role === "user" ? "bg-zinc-800 text-zinc-100" : "text-zinc-300"
                  }`}>
                    {m.role === "assistant" && i === messages.length - 1 && !loading ? (
                      <TypingText text={m.content} />
                    ) : (
                      m.content
                    )}
                    
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 font-semibold mb-2">VERIFIED SOURCES</p>
                        <div className="flex flex-col gap-1">
                          {m.sources.map((src: string, idx: number) => (
                            <a key={idx} href={src} target="_blank" className="text-xs text-blue-400 hover:underline truncate hover:text-blue-300 transition-colors">
                              [{idx + 1}] {src.split('/').pop()}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-zinc-600 mt-1 px-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(m.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="max-w-3xl mx-auto px-16 text-xs text-zinc-500 animate-pulse">
                Processing...
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-800">
          <div className="max-w-3xl mx-auto relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Send a message..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-4 pr-12 text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/50 transition-all hover:border-zinc-700"
              maxLength={5000}
            />
            <button 
              onClick={send} 
              disabled={!input.trim() || loading} 
              className="absolute right-3 top-3 p-1.5 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
            >
              {loading ? <StopCircle size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}