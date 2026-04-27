"use client";

import { useState, useRef, useEffect } from "react";
import { TopBar } from "@/components/top-bar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postChat } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Send, Loader2, MessageCircle, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="flex-1 flex flex-col mx-auto w-full max-w-3xl">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/15 mb-4">
                <MessageCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-300 mb-1">
                Talk to Pulse
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm">
                Ask anything about your AI stack — pricing changes, migration
                strategies, alternative tools, or cost optimization.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 animate-fade-up",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-zinc-800 text-zinc-200 rounded-tr-sm"
                    : "bg-zinc-900/80 border border-zinc-800/50 text-zinc-300 font-mono text-xs rounded-tl-sm"
                )}
              >
                {msg.content || (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700/50 mt-0.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="sticky bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl px-6 py-4">
          <div className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Pulse anything about your stack…"
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-zinc-900/50 border-zinc-700/50 text-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="h-[44px] w-[44px] shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
