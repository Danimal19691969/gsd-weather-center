"use client";

import { useState, useRef, useEffect } from "react";
import { useLocation } from "@/lib/context/LocationContext";
import { Panel } from "@/components/ui/Panel";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const { lat, lon, locationName } = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, lat, lon, locationName }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.message }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Failed to reach the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Panel title="AI Weather Assistant">
      <div ref={scrollRef} className="mb-3 h-64 overflow-y-auto space-y-2">
        {messages.length === 0 && (
          <p className="py-8 text-center font-mono text-xs text-hud-text-dim">
            Ask me about weather conditions, forecasts, buoy data, or activity advice.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded px-3 py-2 font-mono text-xs ${
                msg.role === "user"
                  ? "bg-hud-accent/20 text-hud-text"
                  : "bg-hud-panel border border-hud-border text-hud-text"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded bg-hud-panel border border-hud-border px-3 py-2 font-mono text-xs text-hud-text-dim">
              <span className="animate-pulse">Analyzing conditions...</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about weather, buoys, or conditions..."
          disabled={isLoading}
          className="flex-1 rounded border border-hud-border bg-hud-bg px-3 py-1.5 font-mono text-xs text-hud-text placeholder:text-hud-text-dim focus:border-hud-accent focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={isLoading || !input.trim()}
          className="shrink-0 rounded border border-hud-border bg-hud-accent/20 px-4 py-1.5 font-mono text-xs text-hud-accent hover:bg-hud-accent/30 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </Panel>
  );
}
