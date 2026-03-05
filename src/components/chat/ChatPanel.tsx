"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [streamingText, setStreamingText] = useState("");
  const [statusText, setStatusText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setStatusText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, lat, lon, locationName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages([...newMessages, { role: "assistant", content: "No response stream." }]);
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "text") {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === "status") {
              setStatusText(event.text);
            } else if (event.type === "error") {
              accumulated += `\n\nError: ${event.text}`;
              setStreamingText(accumulated);
            } else if (event.type === "done") {
              // Finalize
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      setMessages([...newMessages, { role: "assistant", content: accumulated || "No response." }]);
      setStreamingText("");
      setStatusText("");
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Failed to reach the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, lat, lon, locationName]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Panel title="AI Weather Assistant">
      <div ref={scrollRef} className="mb-3 h-64 overflow-y-auto space-y-2">
        {messages.length === 0 && !isLoading && (
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
            <div className="max-w-[80%] rounded bg-hud-panel border border-hud-border px-3 py-2 font-mono text-xs text-hud-text">
              {streamingText ? (
                <div className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse">▊</span></div>
              ) : (
                <span className="animate-pulse text-hud-text-dim">
                  {statusText || "Analyzing conditions..."}
                </span>
              )}
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
