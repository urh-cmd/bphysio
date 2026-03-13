"use client";

import { useState } from "react";
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Loader2,
  Check,
  AlertCircle
} from "lucide-react";
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Checkbox } from "./ui-components";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
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

interface BookingFormProps {
  slot: Slot;
  onSubmit: (data: BookingFormData) => void;
  onBack: () => void;
  isLoading: boolean;
}

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  reason: string;
  notes: string;
  privacyAccepted: boolean;
}

const TREATMENT_REASONS = [
  { value: "back", label: "Rückenschmerzen" },
  { value: "neck", label: "Nacken-/Schulterbeschwerden" },
  { value: "leg", label: "Bein-/Kniebeschwerden" },
  { value: "arm", label: "Arm-/Ellenbogenbeschwerden" },
  { value: "sports", label: "Sportverletzung" },
  { value: "post_surgery", label: "Nach Operation" },
  { value: "prevention", label: "Prävention" },
  { value: "other", label: "Sonstiges" },
];

export function BookingForm({ slot, onSubmit, onBack, isLoading }: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    reason: "",
    notes: "",
    privacyAccepted: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});

  const formatDateTime = (isoString: string) => {
    return format(parseISO(isoString), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};

    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "Bitte geben Sie Ihren vollständigen Namen ein";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Bitte geben Sie Ihre E-Mail-Adresse ein";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Bitte geben Sie Ihre Telefonnummer ein";
    } else if (formData.phone.length < 5) {
      newErrors.phone = "Bitte geben Sie eine gültige Telefonnummer ein";
    }

    if (!formData.privacyAccepted) {
      newErrors.privacyAccepted = "Bitte akzeptieren Sie die Datenschutzerklärung";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    } else {
      console.error("Bitte korrigieren Sie die markierten Felder");
    }
  };

  const handleChange = (field: keyof BookingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-blue-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <User className="h-5 w-5 text-sky-600" />
          Ihre Daten
        </CardTitle>
        <CardDescription>
          Bitte geben Sie Ihre Kontaktdaten ein, um die Buchung abzuschließen
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* Selected Slot Summary */}
        <div className="p-4 bg-sky-50 border-b">
          <div className="flex items-start gap-3">
            <div className="bg-sky-600 text-white p-2 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sky-900">Gewählter Termin</h3>
              <p className="text-sky-800 mt-1">
                {formatDateTime(slot.start_time)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-sky-700">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {slot.therapist_name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round((new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000)} Min.
                </span>
              </div>
              {slot.therapist_specialization && (
                <Badge variant="secondary" className="mt-2 bg-sky-100 text-sky-700">
                  {slot.therapist_specialization}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              Vor- und Nachname *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Max Mustermann"
              className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              E-Mail-Adresse *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="max.mustermann@email.de"
              className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              Telefonnummer *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+49 123 456789"
              className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.phone && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Treatment Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Behandlungsgrund (optional)
            </Label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Bitte wählen...</option>
              {TREATMENT_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Zusätzliche Hinweise (optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="z.B. Ersttermin, Nachsorge, spezielle Wünsche..."
              rows={3}
            />
          </div>

          {/* Privacy Checkbox */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                type="checkbox"
                checked={formData.privacyAccepted}
                onChange={(e) => handleChange("privacyAccepted", e.target.checked)}
                className={cn(errors.privacyAccepted && "border-red-500")}
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="privacy"
                  className="text-sm font-medium cursor-pointer"
                >
                  Ich akzeptiere die Datenschutzerklärung *
                </Label>
                <p className="text-xs text-gray-500">
                  Ihre Daten werden gemäß DSGVO verarbeitet und nur für die Terminverwaltung verwendet.
                </p>
              </div>
            </div>
            {errors.privacyAccepted && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.privacyAccepted}
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-sky-600 hover:bg-sky-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gebucht...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Termin buchen
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
