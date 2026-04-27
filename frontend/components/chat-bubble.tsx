"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postChat } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    let assistantContent = "";
    setMessages([...updated, { role: "assistant", content: "" }]);

    await postChat(updated, (chunk) => {
      assistantContent += chunk;
      setMessages([
        ...updated,
        { role: "assistant", content: assistantContent },
      ]);
    });

    setLoading(false);
  }

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-h-[500px] flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-zinc-300">
                Pulse Chat
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px]"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <MessageCircle className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">
                  Ask Pulse anything about your stack.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs leading-relaxed max-w-[85%] rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "ml-auto bg-zinc-800 text-zinc-200"
                    : "bg-emerald-500/10 text-emerald-100 font-mono"
                )}
              >
                {msg.content || (
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-800/60">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Pulse…"
                className="min-h-[36px] max-h-24 flex-1 resize-none bg-zinc-800/50 border-zinc-700/50 text-sm"
                rows={1}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            : "bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-emerald-500/25"
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
