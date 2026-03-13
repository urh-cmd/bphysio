"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export interface AudioRecorderProps {
  /** Nach Ende der Aufnahme: erhält das Audio-Blob (WebM) */
  onRecordingComplete?: (blob: Blob) => void;
  /** Wird während der Aufnahme angezeigt */
  recordingLabel?: string;
  /** Kompakte Darstellung (z.B. inline in Formularen) */
  compact?: boolean;
  /** Mikrofon-Auswahl anzeigen (Standard: ja) */
  showDeviceSelector?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Browser-Audioaufnahme via MediaRecorder API.
 * Mikrofon-Zugriff erforderlich (HTTPS oder localhost).
 * Aufnahmegerät (PC-Mikrofon, Handy-Mikrofon, Headset etc.) wählbar.
 */
export function AudioRecorder({
  onRecordingComplete,
  recordingLabel = "Aufnahme läuft…",
  compact = false,
  showDeviceSelector = true,
  className = "",
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const loadDevices = useCallback(async (requestPermission = false) => {
    try {
      if (requestPermission) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = all.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);
      setSelectedDeviceId((prev) => {
        if (prev && audioInputs.some((d) => d.deviceId === prev)) return prev;
        return audioInputs[0]?.deviceId || "";
      });
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Mikrofon-Zugriff wird von diesem Browser nicht unterstützt (HTTPS erforderlich)");
        return;
      }
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { ideal: selectedDeviceId } }
          : true,
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotFound") || msg.includes("not found")) {
          setError("Kein Mikrofon gefunden. Gerät prüfen und „Aktualisieren“ klicken.");
        } else if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Mikrofon-Berechtigung verweigert. Bitte in den Browser-Einstellungen erlauben.");
        } else if (msg.includes("NotReadable")) {
          setError("Mikrofon wird bereits von einer anderen App genutzt.");
        } else {
          setError(`Mikrofon-Fehler: ${msg}`);
        }
        return;
      }

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "audio/webm";

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          if (blob.size > 0) {
            onRecordingComplete?.(blob);
          } else {
            setError("Aufnahme leer. Bitte mindestens 1–2 Sekunden sprechen.");
          }
        } else {
          setError("Keine Audiodaten. Bitte mindestens 1–2 Sekunden aufnehmen.");
        }
      };
      recorder.onerror = (e) => {
        setError("Aufnahme-Fehler. Bitte erneut versuchen.");
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      loadDevices();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Mikrofon-Zugriff fehlgeschlagen";
      setError(msg.includes("Permission") ? "Mikrofon-Berechtigung erforderlich" : msg);
    } finally {
      setIsRequesting(false);
    }
  }, [onRecordingComplete, selectedDeviceId, loadDevices]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const selectEl = (
    <select
      value={selectedDeviceId}
      onChange={(e) => setSelectedDeviceId(e.target.value)}
      disabled={isRecording}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
      title="Aufnahmegerät auswählen"
    >
      {devices.map((d, i) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label || `Mikrofon ${i + 1}`}
        </option>
      ))}
    </select>
  );

  const deviceSelector = showDeviceSelector && devices.length > 0;

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
        {deviceSelector && selectEl}
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isRequesting}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isRequesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4 text-red-500" />
            )}
            Aufnahme
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            <Square className="h-4 w-4 fill-current" />
            Stopp
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <p className="mb-3 text-sm text-slate-600">
        Patientengespräch direkt aufnehmen und anschließend transkribieren lassen.
      </p>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {deviceSelector && (
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Aufnahmegerät
          </label>
          <div className="flex items-center gap-2">
            {selectEl}
            <button
              type="button"
              onClick={() => loadDevices(true)}
              disabled={isRecording}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
              title="Geräteliste aktualisieren (z.B. nach Anstecken neuer Mikrofone)"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isRequesting}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Mikrofon wird angefordert…
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Aufnahme starten
              </>
            )}
          </button>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700">{recordingLabel}</span>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <Square className="h-4 w-4 fill-current" />
              Stopp
            </button>
          </>
        )}
      </div>
    </div>
  );
}
