"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatWithNormAssistant } from "@/app/actions/ai-chat";
import { RippleButton } from "@/components/ui/multi-type-ripple-buttons";
import { useCountry } from "@/contexts/country-context";

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  sources?: { code: string; title: string; artigo?: string }[];
}

export default function AIChatCard({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Olá! Sou seu assistente especializado em normas arquitetônicas. Como posso ajudar?" },
  ]);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { country } = useCountry();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSources = (msgIndex: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgIndex)) next.delete(msgIndex);
      else next.add(msgIndex);
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await chatWithNormAssistant(userMsg, country?.name);

      if (result.success) {
        setMessages((prev) => [...prev, {
          sender: "ai",
          text: result.response || "Desculpe, não consegui gerar uma resposta.",
          sources: (result as { sources?: { code: string; title: string; artigo?: string }[] }).sources,
        }]);
      } else {
        setMessages((prev) => [...prev, { sender: "ai", text: result.error || "Desculpe, não consegui responder agora." }]);
      }
    } catch (error) {
      console.error("[AIChatCard] Error sending message:", error);
      setMessages((prev) => [...prev, { sender: "ai", text: "Desculpe, ocorreu um erro. Tente novamente mais tarde." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={cn("relative w-[360px] h-[460px] rounded-2xl overflow-hidden", className)}>
      <div className="relative flex flex-col w-full h-full rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 z-10 bg-gray-50 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Assistente de Normas</h2>
        </div>

        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3 text-sm flex flex-col z-10 bg-gray-50/50">
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "px-3 py-2 rounded-xl max-w-[80%] shadow-sm",
                  msg.sender === "ai"
                    ? "bg-white text-gray-900 self-start border border-gray-200"
                    : "bg-emerald-500 text-white font-semibold self-end"
                )}
              >
                {msg.text}
              </motion.div>

              {msg.sender === "ai" && msg.sources && msg.sources.length > 0 && (
                <div className="self-start mt-1 ml-1">
                  <button
                    onClick={() => toggleSources(i)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    {expandedSources.has(i) ? "Ocultar fontes" : `${msg.sources.length} fonte${msg.sources.length > 1 ? "s" : ""}`}
                    {expandedSources.has(i) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedSources.has(i) && (
                    <div className="mt-1 space-y-1">
                      {msg.sources.map((src, si) => (
                        <div key={si} className="text-xs text-zinc-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                          <span className="font-semibold text-zinc-800">{src.code}</span> — {src.title}
                          {src.artigo && <span className="text-blue-600 ml-1">(Art. {src.artigo})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />

          {isTyping && (
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl max-w-[30%] bg-white self-start border border-gray-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.2s" }}></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.4s" }}></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-gray-200 z-10 bg-white shrink-0">
          <input
            className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Pergunte sobre normas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <RippleButton variant="ghost"
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className={`p-2 rounded-lg transition-colors text-white disabled:opacity-40 ${
              isTyping ? "bg-emerald-400" : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
