// Online booking page - public, no login required.

import { Metadata } from "next";
import { OnlineBooking } from "./components/OnlineBooking";

export const metadata: Metadata = {
  title: "Termin buchen | BroPhysio",
  description: "Buchen Sie Ihren Termin online bei BroPhysio",
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <OnlineBooking />
    </div>
  );
}
