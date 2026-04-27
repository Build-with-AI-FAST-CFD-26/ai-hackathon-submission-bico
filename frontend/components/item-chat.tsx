"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postChat } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemChatProps {
  itemId: string;
}

export function ItemChat({ itemId }: ItemChatProps) {
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
    }, itemId);

    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Ask Pulse
        </h4>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-60 overflow-y-auto p-4 space-y-3">
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
      )}

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-zinc-800/60">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about this item…"
          className="flex-1 bg-zinc-800/50 border-zinc-700/50 text-sm"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
