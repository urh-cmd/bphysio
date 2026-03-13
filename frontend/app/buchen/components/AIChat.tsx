"use client";

import { useState, useRef, useEffect } from "react";
// Animations disabled - framer-motion not installed
import { Send, Sparkles, Loader2, Calendar, Clock, ArrowRight } from "lucide-react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, ScrollArea } from "./ui-components";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
// Toast notifications - using console as fallback

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedSlots?: any[];
}

interface AIChatProps {
  onComplete: (suggestedSlots: any[], preferences: any) => void;
  enabled: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Ich habe Rückenschmerzen und brauche einen Termin nächste Woche",
  "Wann ist der nächste freie Termin für eine Massage?",
  "Ich brauche einen Termin am Nachmittag für meine Schulter",
  "Kann ich morgen früh kommen?",
];

export function AIChat({ onComplete, enabled }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hallo! Ich bin Ihr virtueller Assistent für die Terminbuchung. Womit kann ich Ihnen helfen?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api<{ response: string; suggested_slots: any[] }>("/api/appointments/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage.content,
          preferred_date: preferences.date,
          preferred_time: preferences.time,
          treatment_type: preferences.treatment,
        }),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        suggestedSlots: response.suggested_slots,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update preferences based on AI response
      if (response.suggested_slots && response.suggested_slots.length > 0) {
        setPreferences((prev: any) => ({
          ...prev,
          hasSuggestions: true,
        }));
      }
    } catch (error: any) {
      console.error("Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Entschuldigung, ich habe gerade technische Probleme. Sie können direkt zur Terminauswahl gehen.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSkip = () => {
    onComplete([], preferences);
  };

  const handleContinue = () => {
    const lastMessage = messages[messages.length - 1];
    onComplete(lastMessage.suggestedSlots || [], preferences);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  if (!enabled) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Termin buchen</CardTitle>
          <CardDescription>
            Der AI-Assistent ist derzeit nicht verfügbar. Sie können direkt einen Termin auswählen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSkip} className="w-full">
            Zur Terminauswahl
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const hasSuggestions = lastMessage?.suggestedSlots && lastMessage.suggestedSlots.length > 0;

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 text-white p-2 rounded-full">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-sky-900">KI-Assistent</CardTitle>
            <CardDescription className="text-sky-700">
              Beschreiben Sie Ihr Anliegen – ich finde den passenden Termin
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === "user"
                      ? "bg-sky-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {message.role === "user" ? (
                    <span className="text-sm font-medium">Du</span>
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%]",
                    message.role === "user"
                      ? "bg-sky-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  {message.suggestedSlots && message.suggestedSlots.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium opacity-80">Vorgeschlagene Termine:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestedSlots.slice(0, 3).map((slot) => (
                          <Badge
                            key={slot.id}
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 cursor-pointer"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(slot.start_time).toLocaleDateString("de-DE", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              placeholder="Ihre Nachricht..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Oder wählen Sie eine Frage:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs bg-white border border-gray-200 hover:border-sky-300 hover:text-sky-700 rounded-full px-3 py-1.5 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Überspringen
            </Button>
            {hasSuggestions && (
              <Button
                onClick={handleContinue}
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                Weiter zur Auswahl
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
