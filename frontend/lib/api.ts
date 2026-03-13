const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

const FETCH_TIMEOUT_MS = 15000;

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string; timeoutMs?: number } = {}
): Promise<T> {
  const { token, timeoutMs, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData (browser sets boundary)
  if (init.body instanceof FormData) {
    delete (headers as Record<string, string>)["Content-Type"];
  }
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = timeoutMs ?? FETCH_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Zeitüberschreitung. Ist das Backend unter Port 8001 gestartet?");
      }
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error("Verbindung fehlgeschlagen. Backend unter http://127.0.0.1:8001 starten.");
      }
    }
    throw err;
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let msg = err.detail || "Request failed";
    if (res.status === 404 && (!msg || msg === "Not Found")) {
      msg = "Ressource nicht gefunden. Ist das Backend unter Port 8001 gestartet?";
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type LoginResponse = { access_token: string; token_type: string };
export type UserResponse = { id: string; email: string; display_name: string; roles?: string[] };
export type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  insurance_type?: string;
  insurance_name?: string;
  insurance_number?: string;
  notes?: string;
};

export type KeypointFrame = {
  frame: number;
  timestamp: number;
  keypoints: [number, number, number][]; // [x, y, confidence]
};

export type MovementSession = {
  id: string;
  patient_id?: string;
  patient_name?: string;
  status: string;
  session_type: string;
  capture_mode: string;
  fps?: number;
  frame_count?: number;
  metrics_json?: Record<string, unknown>;
  clinical_summary?: string;
  error_message?: string;
  created_at: string;
  keypoints_2d_json?: { frames: KeypointFrame[] };
  progress_percent?: number | null;
};

export type ClinicalRecord = {
  id: string;
  patient_id: string;
  title?: string;
  record_type: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  created_at: string;
  updated_at: string;
};

export type Transcript = {
  id: string;
  progress_percent?: number | null;
  patient_id?: string;
  audio_path?: string;
  raw_text?: string;
  soap_json?: Record<string, unknown>;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
};

export type TrainingPlan = {
  id: string;
  patient_id?: string;
  title: string;
  description?: string;
  content?: string;
  exercises_json?: Record<string, unknown>;
  is_template: boolean;
  created_at: string;
  updated_at: string;
};

export type Zuweiser = {
  id: string;
  title?: string;
  first_name: string;
  last_name: string;
  specialization?: string;
  practice_name?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  address?: string;
  fax?: string;
  notes?: string;
};

export type Recall = {
  id: string;
  patient_id: string;
  recall_date: string;
  reason?: string;
  notes?: string;
  notified: boolean;
  completed: boolean;
};

export type TreatmentLog = {
  id: string;
  patient_id: string;
  treatment_date: string;
  service_code?: string;
  prescription_id?: string;
  duration_minutes?: number;
  note?: string;
};

export type ServiceCatalogItem = {
  id: string;
  code: string;
  name: string;
  description?: string;
  default_duration_min?: number;
  points?: number;
  amount_eur?: number;
  is_active: boolean;
};

export type Prescription = {
  id: string;
  patient_id: string;
  zuweiser_id?: string;
  prescription_date: string;
  valid_until?: string;
  diagnosis_code?: string;
  prescription_number?: string;
  status: string;
  notes?: string;
  items: { id: string; service_code: string; quantity: number; note?: string }[];
  zuweiser_name?: string;
};

export type AdminAppointment = {
  id: string;
  slot_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  start_time: string;
  end_time: string;
  therapist_name: string;
  room_name?: string;
  status: string;
  reason?: string;
  created_at: string;
};

export type AdminSlot = {
  id: string;
  start_time: string;
  end_time: string;
  therapist_name: string;
  room_name?: string;
  is_booked: boolean;
  appointment_id?: string;
  patient_name?: string;
};

export type Therapist = {
  id: string;
  name: string;
  specialization?: string;
};
