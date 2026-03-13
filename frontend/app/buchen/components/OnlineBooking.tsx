"use client";

import { useState, useEffect, useCallback } from "react";
// Animations disabled - framer-motion not installed
import { 
  Calendar, 
  Clock, 
  User, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Activity
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "./ui-components";
// Toast notifications - using console as fallback
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AIChat } from "./AIChat";
import { SlotCalendar } from "./SlotCalendar";
import { BookingForm } from "./BookingForm";
import { BookingConfirmation } from "./BookingConfirmation";
import { api } from "@/lib/api";

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  therapist_name: string;
  therapist_specialization?: string;
  room_name?: string;
  slot_type: string;
}

interface BookingConfig {
  is_enabled: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  default_slot_duration: number;
  ai_chat_enabled: boolean;
  business_hours: Record<string, string[]>;
}

type BookingStep = "chat" | "calendar" | "form" | "confirmation";

export function OnlineBooking() {
  const [step, setStep] = useState<BookingStep>("chat");
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api<BookingConfig>("/api/appointments/config");
      setConfig(data);
    } catch (error) {
      console.error("Failed to load booking config:", error);
      // Use default config
      setConfig({
        is_enabled: true,
        min_advance_hours: 24,
        max_advance_days: 60,
        default_slot_duration: 30,
        ai_chat_enabled: true,
        business_hours: {
          monday: ["08:00-18:00"],
          tuesday: ["08:00-18:00"],
          wednesday: ["08:00-18:00"],
          thursday: ["08:00-18:00"],
          friday: ["08:00-16:00"],
          saturday: [],
          sunday: [],
        },
      });
    }
  };

  const handleChatComplete = useCallback((suggestedSlots: Slot[], preferences: any) => {
    setStep("calendar");
  }, []);

  const handleSlotSelect = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setStep("form");
  }, []);

  const handleBookingSubmit = useCallback(async (formData: any) => {
    if (!selectedSlot) return;
    
    setIsLoading(true);
    try {
      const response = await api<{ id: string; start_time: string; therapist_name: string }>("/api/appointments/book", {
        method: "POST",
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          patient_name: formData.name,
          patient_email: formData.email,
          patient_phone: formData.phone,
          reason: formData.reason,
          notes: formData.notes,
        }),
      });
      
      setBookingData(response);
      setStep("confirmation");
      // Success - could show toast here
      console.log("Termin erfolgreich gebucht!");
    } catch (error: any) {
      console.error(error.message || "Buchung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSlot]);

  const handleBack = useCallback(() => {
    if (step === "calendar") setStep("chat");
    else if (step === "form") setStep("calendar");
  }, [step]);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!config.is_enabled) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Online-Buchung deaktiviert</CardTitle>
            <CardDescription>
              Die Online-Terminbuchung ist derzeit nicht verfügbar. 
              Bitte kontaktieren Sie uns telefonisch.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sky-700">
            <Phone className="h-4 w-4" />
            <span>+49 (0) 123 456789</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 text-white p-2 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">BroPhysio</h1>
              <p className="text-xs text-gray-500">Online-Terminbuchung</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <a href="tel:+49123456789" className="flex items-center gap-1 hover:text-sky-600">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">+49 (0) 123 456789</span>
            </a>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: "chat", label: "Anliegen", icon: MessageCircle },
              { id: "calendar", label: "Termin wählen", icon: Calendar },
              { id: "form", label: "Daten eingeben", icon: User },
              { id: "confirmation", label: "Bestätigung", icon: Check },
            ].map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = 
                (step === "calendar" && s.id === "chat") ||
                (step === "form" && (s.id === "chat" || s.id === "calendar")) ||
                (step === "confirmation");
              
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                      isActive && "bg-sky-100 text-sky-700",
                      isCompleted && !isActive && "text-green-600",
                      !isActive && !isCompleted && "text-gray-400"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                        isActive && "bg-sky-600 text-white",
                        isCompleted && !isActive && "bg-green-100 text-green-600",
                        !isActive && !isCompleted && "bg-gray-100 text-gray-400"
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < 3 && (
                    <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          {step === "chat" && (
            <div key="chat">
              <AIChat 
                onComplete={handleChatComplete} 
                enabled={config.ai_chat_enabled}
              />
            </div>
          )}

          {step === "calendar" && (
            <div key="calendar">
              <SlotCalendar 
                onSelect={handleSlotSelect}
                onBack={handleBack}
                maxAdvanceDays={config.max_advance_days}
              />
            </div>
          )}

          {step === "form" && selectedSlot && (
            <div key="form">
              <BookingForm
                slot={selectedSlot}
                onSubmit={handleBookingSubmit}
                onBack={handleBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {step === "confirmation" && bookingData && (
            <div key="confirmation">
              <BookingConfirmation booking={bookingData} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">BroPhysio</h3>
              <p className="text-sm text-gray-600">
                Ihre moderne Physiotherapie-Praxis mit digitaler Terminbuchung.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Kontakt</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  +49 (0) 123 456789
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  info@brophysio.de
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Öffnungszeiten</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Mo–Do: 8:00–18:00</p>
                <p>Fr: 8:00–16:00</p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
            © 2026 BroPhysio. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  );
}
