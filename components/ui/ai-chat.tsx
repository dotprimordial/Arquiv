"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BGPattern } from "./bg-pattern";
import { chatWithNormAssistant } from "@/app/actions/ai-chat";

export default function AIChatCard({ className }: { className?: string }) {
  const [messages, setMessages] = useState<{ sender: "ai" | "user"; text: string }[]>([
    { sender: "ai", text: "👋 Olá! Sou seu assistente especializado em normas arquitetônicas. Como posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages([...messages, { sender: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await chatWithNormAssistant(userMsg);
      
      if (result.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: result.response || "Desculpe, não consegui gerar uma resposta." }]);
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
    <div className={cn("relative w-[360px] h-[460px] rounded-2xl overflow-hidden p-[2px]", className)}>
      <BGPattern variant="grid" mask="fade-edges" fill="#f3f4f6" />
      {/* Animated Outer Border */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-gray-200"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Card */}
      <div className="relative flex flex-col w-full h-full rounded-xl border border-gray-200 overflow-hidden bg-white backdrop-blur-xl">
        {/* Inner Animated Background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />

        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gray-200/50"
            animate={{
              y: ["0%", "-140%"],
              x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
            style={{ left: `${Math.random() * 100}%`, bottom: "-10%" }}
          />
        ))}

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 relative z-10 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">🤖 Assistente de Normas</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3 text-sm flex flex-col relative z-10 bg-gray-50/50">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
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
          ))}

          {/* AI Typing Indicator */}
          {isTyping && (
            <motion.div
              className="flex items-center gap-1 px-3 py-2 rounded-xl max-w-[30%] bg-white self-start border border-gray-200 shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-200"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-400"></span>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3 border-t border-gray-200 relative z-10 bg-white">
          <input
            className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Pergunte sobre normas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className={`p-2 rounded-lg transition-colors text-white disabled:opacity-40 ${
              isTyping ? 'bg-emerald-400' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
