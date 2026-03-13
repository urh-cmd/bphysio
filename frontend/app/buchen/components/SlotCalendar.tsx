"use client";

import { useState, useEffect, useCallback } from "react";
// Animations disabled - framer-motion not installed
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  Loader2,
  Filter
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, ScrollArea } from "./ui-components";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format, addDays, startOfWeek, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";
// Toast notifications - using console as fallback

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  therapist_name: string;
  therapist_specialization?: string;
  room_name?: string;
  slot_type: string;
}

interface SlotCalendarProps {
  onSelect: (slot: Slot) => void;
  onBack: () => void;
  maxAdvanceDays: number;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function SlotCalendar({ onSelect, onBack, maxAdvanceDays }: SlotCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [therapists, setTherapists] = useState<{ id: string; name: string; specialization?: string }[]>([]);

  // Load therapists on mount
  useEffect(() => {
    loadTherapists();
  }, []);

  // Load slots when week changes
  useEffect(() => {
    loadSlots();
  }, [currentWeek, selectedTherapist]);

  const loadTherapists = async () => {
    try {
      const data = await api<{ id: string; name: string; specialization?: string }[]>("/api/appointments/therapists");
      setTherapists(data);
    } catch (error) {
      console.error("Failed to load therapists:", error);
    }
  };

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const fromDate = currentWeek.toISOString();
      const toDate = addDays(currentWeek, 7).toISOString();
      
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
      });
      
      if (selectedTherapist) {
        params.append("therapist_id", selectedTherapist);
      }
      
      const data = await api<Slot[]>(`/api/appointments/slots?${params}`);
      setSlots(data);
    } catch (error) {
      console.error("Termine konnten nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentWeek, 1);
    const maxDate = addDays(new Date(), maxAdvanceDays);
    
    if (nextWeek <= maxDate) {
      setCurrentWeek(nextWeek);
    } else {
      console.log("Sie können maximal " + maxAdvanceDays + " Tage im Voraus buchen");
    }
  };

  const getDaysOfWeek = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  };

  const getSlotsForDay = (date: Date) => {
    return slots.filter((slot) => 
      isSameDay(parseISO(slot.start_time), date)
    ).sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  };

  const formatTime = (isoString: string) => {
    return format(parseISO(isoString), "HH:mm");
  };

  const days = getDaysOfWeek();

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-sky-600" />
              Termin auswählen
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Wählen Sie einen passenden Termin aus dem Kalender
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              disabled={currentWeek <= startOfWeek(new Date(), { weekStartsOn: 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[150px] text-center">
              {format(currentWeek, "d. MMMM", { locale: de })} - {" "}
              {format(addDays(currentWeek, 6), "d. MMMM yyyy", { locale: de })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Therapist Filter */}
        {therapists.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Therapeut:</span>
            <Button
              variant={selectedTherapist === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTherapist(null)}
              className={selectedTherapist === null ? "bg-sky-600" : ""}
            >
              Alle
            </Button>
            {therapists.map((t) => (
              <Button
                key={t.id}
                variant={selectedTherapist === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTherapist(t.id)}
                className={selectedTherapist === t.id ? "bg-sky-600" : ""}
              >
                {t.name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <>
            {/* Week View */}
            <div className="grid grid-cols-7 border-b">
              {days.map((day, i) => {
                const daySlots = getSlotsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "p-4 text-center border-r last:border-r-0 transition-colors hover:bg-gray-50",
                      isSelected && "bg-sky-50 hover:bg-sky-100",
                      isToday && "bg-sky-50/50"
                    )}
                  >
                    <div className="text-xs text-gray-500 uppercase">{WEEKDAYS[i]}</div>
                    <div className={cn(
                      "text-lg font-semibold mt-1",
                      isToday && "text-sky-600",
                      isSelected && "text-sky-700"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {daySlots.length > 0 ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          {daySlots.length} frei
                        </Badge>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Slots */}
            {selectedDate && (
              <div
                className="border-b"
              >
                <div className="p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Verfügbare Termine am{" "}
                    {format(selectedDate, "EEEE, d. MMMM", { locale: de })}
                  </h3>
                  
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getSlotsForDay(selectedDate).map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => onSelect(slot)}
                          className="p-3 bg-white border rounded-lg hover:border-sky-500 hover:shadow-md transition-all text-left"
                        >
                          <div className="flex items-center gap-2 text-sky-700 font-semibold">
                            <Clock className="h-4 w-4" />
                            {formatTime(slot.start_time)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {slot.therapist_name}
                          </div>
                          {slot.therapist_specialization && (
                            <div className="text-xs text-gray-400 mt-1">
                              {slot.therapist_specialization}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {getSlotsForDay(selectedDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>Keine freien Termine an diesem Tag</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Bitte wählen Sie einen anderen Tag
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* No Selection Hint */}
            {!selectedDate && (
              <div className="p-8 text-center text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Wählen Sie einen Tag aus dem Kalender</p>
                <p className="text-sm text-gray-400 mt-1">
                  Klicken Sie auf einen Tag, um die verfügbaren Termine zu sehen
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div className="text-sm text-gray-500">
            {slots.length} Termine verfügbar
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
