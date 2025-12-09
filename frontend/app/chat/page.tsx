"use client";
import { useState, useRef, useEffect } from "react";
import { Send, StopCircle, User, Bot } from "lucide-react";

const TypingText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      setDisplay(prev => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 8);
    return () => clearInterval(timer);
  }, [text]);
  return <span>{display}</span>;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "I am The People's Agent. I have access to the federal policy database.", sources: [] }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error connecting to secure backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-zinc-950">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <span className="text-sm font-semibold text-zinc-200">The People's Agent</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                m.role === "user" ? "bg-zinc-800" : "bg-blue-700"
              }`}>
                {m.role === "user" ? <User size={16} className="text-zinc-400" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-7 ${
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
                        <a key={idx} href={src} target="_blank" className="text-xs text-blue-400 hover:underline truncate">
                          [{idx + 1}] {src.split('/').pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <div className="max-w-3xl mx-auto px-16 text-xs text-zinc-500 animate-pulse">Processing...</div>}
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-4 pr-12 text-zinc-200 focus:outline-none focus:border-zinc-600 transition-all"
          />
          <button onClick={send} disabled={!input.trim() || loading} className="absolute right-3 top-3 p-1.5 text-zinc-400 hover:text-white">
            {loading ? <StopCircle size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}