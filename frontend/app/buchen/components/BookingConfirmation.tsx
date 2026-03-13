"use client";

// Animations disabled - framer-motion not installed
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Download,
  Share2,
  Home
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "./ui-components";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface BookingConfirmationProps {
  booking: {
    id: string;
    patient_name: string;
    patient_email: string;
    start_time: string;
    end_time: string;
    therapist_name: string;
    status: string;
  };
}

export function BookingConfirmation({ booking }: BookingConfirmationProps) {
  const formatDateTime = (isoString: string) => {
    return format(parseISO(isoString), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de });
  };

  const handleAddToCalendar = () => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    
    // Create Google Calendar link
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Termin bei BroPhysio - ${booking.therapist_name}`,
      dates: `${start.toISOString().replace(/[-:]/g, "").split(".")[0]}/${end.toISOString().replace(/[-:]/g, "").split(".")[0]}`,
      details: `Ihr Termin bei BroPhysio\\nTherapeut: ${booking.therapist_name}\\nBuchungsnummer: ${booking.id}`,
      location: "BroPhysio, Musterstraße 123, 12345 Musterstadt",
    });
    
    window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mein Termin bei BroPhysio",
          text: `Ich habe einen Termin bei BroPhysio gebucht am ${formatDateTime(booking.start_time)}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Termin bei BroPhysio\\nDatum: ${formatDateTime(booking.start_time)}\\nTherapeut: ${booking.therapist_name}\\nBuchungsnummer: ${booking.id}`;
      navigator.clipboard.writeText(text);
      alert("Termindetails in die Zwischenablage kopiert!");
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4"
          >
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-900">
            Termin bestätigt!
          </CardTitle>
          <CardDescription className="text-green-700 mt-2">
            Ihr Termin wurde erfolgreich gebucht. Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Booking Details */}
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            Termindetails
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{formatDateTime(booking.start_time)}</p>
                <p className="text-sm text-gray-500">
                  Dauer: {Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000)} Minuten
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{booking.therapist_name}</p>
                <p className="text-sm text-gray-500">Ihr Therapeut</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{booking.patient_email}</p>
                <p className="text-sm text-gray-500">Bestätigung gesendet an</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">BroPhysio</p>
                <p className="text-sm text-gray-500">Musterstraße 123, 12345 Musterstadt</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Buchungsnummer</span>
              <Badge variant="secondary" className="font-mono">
                Buchung {format(parseISO(booking.start_time), "dd.MM.yyyy HH:mm", { locale: de })} Uhr
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleAddToCalendar}
            className="w-full"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Zum Kalender
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Teilen
          </Button>
        </div>

        {/* Info */}
        <div className="bg-sky-50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sky-900">Was kommt als Nächstes?</h4>
          <ul className="text-sm text-sky-800 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Sie erhalten eine E-Mail-Bestätigung mit allen Details
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Erinnerung 24 Stunden vor dem Termin per E-Mail/SMS
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Bei Verhinderung bitte mindestens 24h vorher absagen
            </li>
          </ul>
        </div>

        {/* Back to Home */}
        <Button
          onClick={() => window.location.href = "/"}
          className="w-full bg-sky-600 hover:bg-sky-700"
        >
          <Home className="mr-2 h-4 w-4" />
          Zurück zur Startseite
        </Button>
      </CardContent>
    </Card>
  );
}
