"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Loader2, 
  ExternalLink, 
  BookOpen,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Citation {
  sourceUrl: string;
  sourceTitle: string;
  claimText: string;
  stance?: string;
  date: string;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  citations?: Citation[];
  relatedConcepts?: Array<{ id: string; label: string; direction: string }>;
  timestamp: Date;
}

export default function QueryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/graph/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage.content }),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer || "I couldn't process that question.",
        citations: data.citations || [],
        relatedConcepts: data.relatedConcepts || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const suggestedQuestions = [
    "What have I read about AI recently?",
    "How has my view on climate change evolved?",
    "Which topics do I engage with most?",
    "What are my strongest beliefs?",
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Ask Your Graph
        </h1>
        <p className="text-zinc-500">
          Ask questions about what you've read and how your thinking has evolved.
          I'll cite specific sources—never summarize your views.
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-4 min-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500/10 to-amber-500/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Start a conversation
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Try one of these questions or ask your own:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(q)}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-zinc-400"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching your belief graph...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-4">
        <Card>
          <CardContent className="p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your reading history, beliefs, or patterns..."
                className="flex-1 px-4 py-2 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-rose-500 to-amber-500 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.type === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-zinc-500">Mindlayer</span>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Sources
            </p>
            <div className="space-y-2">
              {message.citations.map((citation, i) => (
                <CitationCard key={i} citation={citation} />
              ))}
            </div>
          </div>
        )}

        {/* Related Concepts */}
        {message.relatedConcepts && message.relatedConcepts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 mb-2">
              Related concepts
            </p>
            <div className="flex flex-wrap gap-1">
              {message.relatedConcepts.map((concept) => (
                <Badge
                  key={concept.id}
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    concept.direction === "positive" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    concept.direction === "negative" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                    concept.direction === "mixed" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  )}
                >
                  {concept.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-400 mt-2">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function CitationCard({ citation }: { citation: Citation }) {
  const stanceColors = {
    agree: "text-amber-600",
    disagree: "text-rose-600",
    complicated: "text-amber-600",
  };

  return (
    <a
      href={citation.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{citation.sourceTitle}</p>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
            "{citation.claimText}"
          </p>
          {citation.stance && (
            <p className={cn("text-xs mt-1", stanceColors[citation.stance as keyof typeof stanceColors] || "text-zinc-500")}>
              You: {citation.stance}
            </p>
          )}
        </div>
        <ExternalLink className="w-3 h-3 text-zinc-400 flex-shrink-0" />
      </div>
    </a>
  );
}
