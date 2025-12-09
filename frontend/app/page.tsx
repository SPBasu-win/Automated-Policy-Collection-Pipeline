"use client";
import { useEffect, useState } from "react";
import { FileText, ArrowUpRight, CheckCircle } from "lucide-react";

export default function Home() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/updates")
      .then((res) => res.json())
      .then((data) => {
        setUpdates(data.updates);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-12 py-16">
      <header className="mb-12 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Notification Center</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Live stream of government documents processed by the automated pipeline.
        </p>
      </header>

      <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
      
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="col-span-6">Document Name</div>
          <div className="col-span-2">Date Processed</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Source</div>
        </div>

      
        {loading && <div className="p-8 text-center text-zinc-600 text-sm animate-pulse">Syncing...</div>}
        {!loading && updates.length === 0 && (
          <div className="p-12 text-center text-zinc-600 text-sm">No recent updates found.</div>
        )}

       
        <div className="divide-y divide-zinc-800/50">
          {updates.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-800/30 transition-colors group">
              <div className="col-span-6 flex items-center gap-3">
                <FileText className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                <div className="truncate">
                  <span className="block text-sm text-zinc-300 font-medium truncate pr-4">{item.title}</span>
                  <span className="block text-xs text-zinc-600 font-mono truncate max-w-md">{item.url}</span>
                </div>
              </div>
              <div className="col-span-2 text-xs text-zinc-500 font-mono">
                {new Date().toLocaleDateString()}
              </div>
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  <CheckCircle size={10} /> Indexed
                </span>
              </div>
              <div className="col-span-2 flex justify-end">
                <a href={item.url} target="_blank" className="text-xs text-zinc-500 hover:text-white hover:underline flex items-center gap-1">
                  View PDF <ArrowUpRight size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}