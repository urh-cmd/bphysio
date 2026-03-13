"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, MovementSession, KeypointFrame } from "@/lib/api";
import { PoseVideoPlayer } from "@/components/PoseVideoPlayer";
import {
  ArrowLeft,
  Trash2,
  Activity,
  TrendingUp,
  Film,
  BarChart3,
  Download,
  Bot,
  Scale,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

const Plot = dynamic(
  () => import("react-plotly.js").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="flex h-64 items-center justify-center text-slate-500">Lade Diagramm…</div> }
);

const KEYPOINT_NAMES = [
  "Nase",
  "L Auge",
  "R Auge",
  "L Ohr",
  "R Ohr",
  "L Schulter",
  "R Schulter",
  "L Ellbogen",
  "R Ellbogen",
  "L Handgelenk",
  "R Handgelenk",
  "L Hüfte",
  "R Hüfte",
  "L Knie",
  "R Knie",
  "L Knöchel",
  "R Knöchel",
];

type TabId =
  | "keypoint"
  | "pose"
  | "statistik"
  | "analyse"
  | "symmetrie"
  | "ki"
  | "export";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "keypoint", label: "Keypoint-Verlauf", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "pose", label: "Pose-Video", icon: <Film className="h-4 w-4" /> },
  { id: "statistik", label: "Statistiken", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "analyse", label: "Ganganalyse", icon: <Activity className="h-4 w-4" /> },
  { id: "symmetrie", label: "Symmetrie", icon: <Scale className="h-4 w-4" /> },
  { id: "ki", label: "KI-Bericht", icon: <Bot className="h-4 w-4" /> },
  { id: "export", label: "Export", icon: <Download className="h-4 w-4" /> },
];

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function MovementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<MovementSession | null>(null);
  const [keypoints, setKeypoints] = useState<KeypointFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [keypointsLoading, setKeypointsLoading] = useState(false);
  const [keypointsError, setKeypointsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("keypoint");
  const [selectedKp, setSelectedKp] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const sessionId = params.id;

  useEffect(() => {
    if (!token || !sessionId) return;
    api<MovementSession>(`/api/movement/sessions/${sessionId}`, { token })
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [token, sessionId]);

  const fetchKeypoints = useCallback(() => {
    if (!token || !sessionId) return;
    setKeypointsError(null);
    setKeypointsLoading(true);
    api<{ frames?: KeypointFrame[] }>(`/api/movement/sessions/${sessionId}/keypoints`, { token })
      .then((r) => setKeypoints(Array.isArray(r?.frames) ? r.frames : []))
      .catch((err) => {
        setKeypoints([]);
        setKeypointsError(err instanceof Error ? err.message : "Keypoints konnten nicht geladen werden.");
      })
      .finally(() => setKeypointsLoading(false));
  }, [token, sessionId]);

  useEffect(() => {
    if (session?.status === "completed" && sessionId) {
      const framesFromSession = session.keypoints_2d_json?.frames;
      if (Array.isArray(framesFromSession) && framesFromSession.length > 0) {
        setKeypoints(framesFromSession as KeypointFrame[]);
        setKeypointsLoading(false);
        setKeypointsError(null);
      } else {
        fetchKeypoints();
      }
    } else {
      setKeypoints([]);
      setKeypointsLoading(false);
      setKeypointsError(null);
    }
  }, [session?.status, session?.keypoints_2d_json?.frames, sessionId, fetchKeypoints]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <p className="text-slate-600">Session nicht gefunden.</p>
        <Link
          href="/dashboard/movement"
          className="mt-4 text-primary-600 hover:underline"
        >
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const frames = keypoints.length > 0 ? keypoints : ((session.keypoints_2d_json?.frames ?? []) as KeypointFrame[]);
  const m = session.metrics_json || {};
  const fps = session.fps ?? 30;
  const totalFrames = session.frame_count ?? frames.length;
  const duration = totalFrames / fps;

  const handleDelete = async () => {
    if (!confirm("Bewegungssession wirklich unwiderruflich löschen? (inkl. Video)")) return;
    setDeleting(true);
    try {
      await api(`/api/movement/sessions/${sessionId}`, { method: "DELETE", token: token! });
      router.push("/dashboard/movement");
    } catch {
      setDeleting(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/dashboard/movement"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        {canDelete(user?.roles) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Löscht…" : "Session löschen"}
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Activity className="h-8 w-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Ganganalyse-Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Vollständige Analyse mit allen Metriken
          </p>
        </div>
      </div>

      {session.status === "pending" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Session noch nicht verarbeitet. Gehe zur Liste und klicke auf
          „Verarbeiten“.
        </div>
      )}

      {session.status === "failed" && (
        <FailedSessionBanner
          errorMessage={session.error_message}
          sessionId={sessionId}
          token={token ?? undefined}
          onRetrySuccess={(updated) => setSession(updated)}
        />
      )}

      {session.status === "completed" && (
        <>
          {/* Info-Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Patient</p>
              {session.patient_id ? (
                <Link
                  href={`/dashboard/patients/${session.patient_id}`}
                  className="font-semibold text-slate-800 hover:text-primary-600 hover:underline"
                >
                  {session.patient_name ?? "Unbekannter Patient"}
                </Link>
              ) : (
                <p className="font-semibold text-slate-800">—</p>
              )}
            </div>
            <InfoCard label="Dauer" value={`${duration.toFixed(1)}s`} />
            <InfoCard label="Frames" value={String(totalFrames)} />
            <InfoCard label="FPS" value={fps.toFixed(1)} />
            <InfoCard
              label="Ø Keypoints/Frame"
              value={
                frames.length
                  ? (
                      frames.reduce(
                        (s, f) => s + (f.keypoints?.length ?? 0),
                        0
                      ) / frames.length
                    ).toFixed(1)
                  : "—"
              }
            />
          </div>

          {/* Tabs */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === t.id
                      ? "border-b-2 border-primary-500 text-primary-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "keypoint" && (
                <TabKeypoint
                  frames={frames}
                  selectedKp={selectedKp}
                  setSelectedKp={setSelectedKp}
                  fps={fps}
                  loading={keypointsLoading}
                  error={keypointsError}
                  onRetry={fetchKeypoints}
                />
              )}
              {activeTab === "pose" && (
                <TabPose
                  sessionId={sessionId}
                  token={token ?? null}
                  frames={frames}
                  fps={fps}
                  loading={keypointsLoading}
                  error={keypointsError}
                  onRetry={fetchKeypoints}
                />
              )}
              {activeTab === "ki" && (
                <TabKI sessionId={sessionId} token={token ?? undefined} />
              )}
              {activeTab === "analyse" && (
                <TabAnalyse metrics={m} clinicalSummary={session.clinical_summary} />
              )}
              {activeTab === "export" && (
                <TabExport
                  session={session}
                  frames={frames}
                  metrics={m}
                  token={token ?? undefined}
                />
              )}
              {activeTab === "statistik" && (
                <TabStatistik frames={frames} totalFrames={totalFrames} fps={fps} duration={duration} />
              )}
              {activeTab === "symmetrie" && <TabSymmetrie metrics={m} />}
            </div>
          </div>
        </>
      )}

      <p className="mt-6 text-sm text-slate-500">
        Erstellt: {new Date(session.created_at).toLocaleString("de-DE")}
      </p>
    </div>
  );
}

function FailedSessionBanner({
  errorMessage,
  sessionId,
  token,
  onRetrySuccess,
}: {
  errorMessage?: string | null;
  sessionId: string;
  token?: string;
  onRetrySuccess: (session: MovementSession) => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!token) return;
    setRetryError(null);
    setRetrying(true);
    try {
      const updated = await api<MovementSession>(`/api/movement/process/${sessionId}`, {
        method: "POST",
        token,
        timeoutMs: 300000,
      });
      if (updated.status === "failed") setRetryError(updated.error_message || "Erneut fehlgeschlagen");
      else onRetrySuccess(updated);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Verarbeitung fehlgeschlagen");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="font-medium text-red-800">Verarbeitung fehlgeschlagen</p>
      <p className="mt-1 text-sm text-red-700">{errorMessage || "Unbekannter Fehler während der Pose-Extraktion oder Ganganalyse."}</p>
      {retryError && <p className="mt-2 text-sm text-red-600">{retryError}</p>}
      <button
        type="button"
        onClick={handleRetry}
        disabled={!token || retrying}
        className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {retrying ? "Wird verarbeitet…" : "Erneut verarbeiten"}
      </button>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/** Parst klinische Zusammenfassung (alt: Markdown, neu: KEY:value) und rendert als Karten */
function ClinicalSummaryBlock({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: { label: string; value: string }[] = [];
  let statusLine = "";

  for (const line of lines) {
    if (line.startsWith("##") || line === "Ganganalyse-Befund") continue;
    const newFormat = line.match(/^([A-ZÄÖÜa-zäöüß0-9_]+):(.+)$/);
    if (newFormat) {
      const [, key, val] = newFormat;
      const labelMap: Record<string, string> = {
        BEFUND: "Befund",
        SCHRITTANZAHL: "Schrittanzahl",
        CADENZ: "Cadenz",
        SCHRITTLÄNGE_LINKS: "Schrittlänge links",
        SCHRITTLÄNGE_RECHTS: "Schrittlänge rechts",
        MAX_KNIEFLEXION: "Max. Knieflexion",
      };
      const label = labelMap[key?.trim() ?? ""] ?? key?.replace(/_/g, " ");
      const value = val?.trim() ?? "";
      if (key === "BEFUND") statusLine = value;
      else if (value) {
        let display = value;
        if (key === "CADENZ") display = `${value} Schritte/min`;
        else if (key?.includes("SCHRITTLÄNGE")) display = `${value} cm`;
        else if (key?.includes("KNIEFLEXION")) display = `${value}°`;
        items.push({ label, value: display });
      }
      continue;
    }
    const oldFormat = line.match(/^\*\*(.+?):?\*\*\s*(.*)$/);
    if (oldFormat) {
      const [, label, val] = oldFormat;
      const v = (val || line.replace(/^\*\*.+?\*\*\s*/, "").replace(/^[-•]\s*/, "")).trim();
      if (label?.toLowerCase().includes("schrittlängen")) continue;
      if (v && !line.startsWith("   ")) items.push({ label: label ?? "", value: v });
      continue;
    }
    if (line.match(/^[-•]\s+/) && items.length > 0) {
      const v = line.replace(/^[-•]\s+/, "");
      if (v.includes(":")) {
        const [l, ...rest] = v.split(":");
        items.push({ label: (l ?? "").trim(), value: rest.join(":").trim() });
      }
    } else if (line.includes("Symmetrisch") || line.includes("Auffällig") || line.includes("erkannt")) {
      statusLine = line.replace(/\*\*/g, "").replace(/^[✅✓⚠️]\s*/, "").trim();
    }
  }

  return (
    <div className="space-y-4">
      {statusLine && (
        <div
          className={`rounded-lg border p-4 ${
            statusLine.includes("Auffällig") || statusLine.includes("Asymmetr")
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-sm font-medium text-slate-800">{statusLine}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <InfoCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}

const PLOTLY_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#64748b", size: 12, family: "Inter, sans-serif" },
  margin: { l: 50, r: 30, t: 40, b: 40 },
  xaxis: { gridcolor: "rgba(148,163,184,0.2)", zerolinecolor: "rgba(148,163,184,0.3)" },
  yaxis: { gridcolor: "rgba(148,163,184,0.2)", zerolinecolor: "rgba(148,163,184,0.3)" },
};

/* Recharts: einheitliches Design – schmale Balken, dezentes Grid, Tooltip */
const CHART_GRID = { strokeDasharray: "3 3", stroke: "#e2e8f0" };
const CHART_TOOLTIP = {
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  labelStyle: { color: "#475569", fontWeight: 500 },
};

function TabKeypoint({
  frames,
  selectedKp,
  setSelectedKp,
  fps,
  loading,
  error,
  onRetry,
}: {
  frames: KeypointFrame[];
  selectedKp: number;
  setSelectedKp: (v: number) => void;
  fps: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const numKp = frames.length ? Math.max(...frames.map((f) => f.keypoints?.length ?? 0), 0) : 0;

  const chartData = frames.map((f) => {
    const kp = f.keypoints?.[selectedKp];
    const t = typeof f.timestamp === "number" ? f.timestamp : 0;
    return {
      time: t,
      frame: f.frame,
      x: typeof kp?.[0] === "number" ? kp[0] : null,
      y: typeof kp?.[1] === "number" ? kp[1] : null,
      confidence: typeof kp?.[2] === "number" ? kp[2] : null,
    };
  });
  const hasConf = chartData.some((d) => d.confidence != null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-slate-500">Keypoints werden geladen…</p>
      </div>
    );
  }
  if (!frames.length || numKp === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <p className="mb-2 text-amber-800">
          {error ?? "Keine Keypoint-Daten. Bitte Session verarbeiten oder erneut laden."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Keypoints erneut laden
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Keypoints über Zeit</h3>
      <select
        value={selectedKp}
        onChange={(e) => setSelectedKp(Number(e.target.value))}
        className="mb-4 rounded border border-slate-300 px-3 py-2 text-sm"
      >
        {Array.from({ length: numKp }, (_, i) => (
          <option key={i} value={i}>
            {i}: {KEYPOINT_NAMES[i] ?? String(i)}
          </option>
        ))}
      </select>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-medium text-slate-700">X-Koordinate</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(value: number) => [value?.toFixed(1) ?? "—", "Pixel"]}
                  labelFormatter={(label) => `Zeit: ${Number(label).toFixed(2)} s`}
                />
                <Line
                  type="monotone"
                  dataKey="x"
                  name="X"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-medium text-slate-700">Y-Koordinate</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(value: number) => [value?.toFixed(1) ?? "—", "Pixel"]}
                  labelFormatter={(label) => `Zeit: ${Number(label).toFixed(2)} s`}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  name="Y"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {hasConf && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-medium text-slate-700">Confidence über Zeit</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#94a3b8" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(value: number) => [value != null ? (value * 100).toFixed(1) + "%" : "—", "Confidence"]}
                  labelFormatter={(label) => `Zeit: ${Number(label).toFixed(2)} s`}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  name="Confidence"
                  stroke="#7DD3FC"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function TabPose({
  sessionId,
  token,
  frames,
  fps,
  loading,
  error,
  onRetry,
}: {
  sessionId: string;
  token: string | null;
  frames: KeypointFrame[];
  fps: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [minConf, setMinConf] = useState(0.5);
  const [useFallback, setUseFallback] = useState(false);
  const defaultIdx = Math.min(Math.floor(frames.length / 2), Math.max(0, frames.length - 1));
  const [frameIdx, setFrameIdx] = useState(defaultIdx);
  const f = frames[frameIdx] ?? frames[0];
  const kps = f?.keypoints ?? [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-slate-500">Pose-Daten werden geladen…</p>
      </div>
    );
  }
  if (!frames.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <p className="mb-2 text-amber-800">
          {error ?? "Keine Pose-Daten. Bitte Session verarbeiten oder erneut laden."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Pose-Daten erneut laden
          </button>
        )}
      </div>
    );
  }

  const xs: number[] = [];
  const ys: number[] = [];
  const labels: string[] = [];
  kps.forEach((kp, i) => {
    if (Array.isArray(kp) && typeof kp[0] === "number" && typeof kp[1] === "number") {
      xs.push(kp[0]);
      ys.push(kp[1]);
      labels.push(KEYPOINT_NAMES[i] ?? String(i));
    }
  });

  // Hauptansicht: Video-Player mit Pose-Overlay (wie Streamlit)
  if (!useFallback && token) {
    return (
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-700">Video mit Pose-Overlay</h3>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Min. Confidence für Keypoints
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={minConf}
            onChange={(e) => setMinConf(Number(e.target.value))}
            className="w-full max-w-xs"
          />
          <span className="ml-2 text-sm text-slate-500">{minConf.toFixed(1)}</span>
        </div>
        <PoseVideoPlayer
          sessionId={sessionId}
          token={token}
          frames={frames}
          fps={fps}
          minConfidence={minConf}
        />
        <button
          type="button"
          onClick={() => setUseFallback(true)}
          className="mt-4 text-sm text-slate-500 underline hover:text-slate-700"
        >
          Fallback: Keypoint-Diagramm anzeigen
        </button>
      </div>
    );
  }

  // Fallback: Keypoint-Diagramm (wenn Video fehlt oder Nutzer wechselt)
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Video mit Pose-Overlay</h3>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Video nicht gefunden – zeige Keypoint-Positionen als Diagramm (Y-Achse wie Bildkoordinaten).
      </div>
      {token && (
        <button
          type="button"
          onClick={() => setUseFallback(false)}
          className="mb-4 text-sm text-primary-600 underline hover:text-primary-700"
        >
          Video-Player versuchen
        </button>
      )}
      <div className="mb-4">
        <label className="block text-sm text-slate-600">
          Frame: {frameIdx} / {frames.length - 1} (t = {(frameIdx / fps).toFixed(2)}s)
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={frameIdx}
          onChange={(e) => setFrameIdx(Number(e.target.value))}
          className="w-full"
        />
      </div>
      {xs.length > 0 ? (
        <div className="h-[500px]">
          <Plot
            data={[
              {
                x: xs,
                y: ys,
                text: labels,
                type: "scatter",
                mode: "markers+text",
                textposition: "top center",
                marker: { size: 10, color: "#0EA5E9" },
                textfont: { size: 10 },
              },
            ]}
            layout={{
              ...PLOTLY_LAYOUT,
              title: `Frame ${frameIdx} – Keypoints`,
              xaxis: { ...PLOTLY_LAYOUT.xaxis, title: "X" },
              yaxis: {
                ...PLOTLY_LAYOUT.yaxis,
                title: "Y",
                autorange: "reversed",
              },
              height: 500,
            }}
            useResizeHandler
            config={{ responsive: true }}
            style={{ width: "100%" }}
          />
        </div>
      ) : (
        <p className="py-8 text-slate-500">Keine Keypoints in diesem Frame.</p>
      )}
    </div>
  );
}

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

function TabKI({ sessionId, token }: { sessionId: string; token?: string }) {
  const [provider, setProvider] = useState("nvidia");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleKiPdfDownload = async () => {
    if (!token || !report) return;
    setPdfError(null);
    setPdfLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/movement/sessions/${sessionId}/ai_report_pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ report }),
      });
      if (!res.ok) throw new Error(await res.text() || "PDF konnte nicht erstellt werden");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `KI-Befundbericht_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!token || !sessionId) return;
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const body: { provider: string; model?: string } = {
        provider,
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min für LLM
      const res = await api<{ report: string }>(
        `/api/movement/sessions/${sessionId}/ai_report`,
        {
          token,
          method: "POST",
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      setReport(res.report);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Zeitüberschreitung (2 Min). Bitte erneut versuchen oder kleineres Modell wählen."
            : err.message
          : "Unbekannter Fehler";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">KI-Bericht</h3>
      <h4 className="mb-2 font-medium text-slate-700">API-Konfiguration</h4>
      <select
        value={provider}
        onChange={(e) => {
          setProvider(e.target.value);
          setError(null);
          setReport(null);
        }}
        className="mb-4 rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="nvidia">NVIDIA (Kimi K2.5)</option>
        <option value="ollama">Ollama (Lokal)</option>
        <option value="openai">OpenAI</option>
      </select>
      {provider === "ollama" && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Kein API Key nötig. Ollama muss lokal laufen (Standard: localhost:11434).
        </p>
      )}
      {provider === "nvidia" && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          API Key aus Einstellungen wird verwendet.
        </p>
      )}
      {provider === "openai" && (
        <p className="mb-4 text-sm text-slate-600">
          API Key aus Einstellungen wird verwendet.
        </p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleGenerate}
        className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generiere…" : "KI-Bericht generieren"}
      </button>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {report && (
        <div className="mt-8">
          <div className="max-w-3xl rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-800">Ganganalyse-Befundbericht</h4>
                  <p className="text-xs text-slate-500">
                    {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleKiPdfDownload}
                disabled={!token || pdfLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? "Erstelle…" : "PDF herunterladen"}
              </button>
            </div>
            {pdfError && (
              <div className="mx-8 mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {pdfError}
              </div>
            )}
            <div className="px-8 py-6 text-slate-600">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="mb-4 mt-6 border-b border-slate-200 pb-2 text-base font-semibold text-slate-800 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-700">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-medium text-slate-700">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-600 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5 text-slate-600">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5 text-slate-600">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                }}
              >
                {report}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabAnalyse({
  metrics,
  clinicalSummary,
}: {
  metrics: Record<string, unknown>;
  clinicalSummary?: string | null;
}) {
  const stepCount = metrics.step_count as number | undefined;
  const cadence = metrics.cadence as number | undefined;
  const sym = metrics.symmetry_index as number | undefined;
  const hasAsym = metrics.has_asymmetry as boolean | undefined;
  const hasPhaseAsym = metrics.has_phase_asymmetry as boolean | undefined;

  const hasMetrics = Object.keys(metrics).length > 0;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Ganganalyse</h3>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Automatische Berechnung von Gait-Metriken aus Keypoint-Daten
      </div>
      {!hasMetrics && (
        <p className="text-slate-500">Keine Analysedaten vorhanden.</p>
      )}
      {hasMetrics && (
        <>
          {clinicalSummary && (
            <>
              <h4 className="mb-3 font-medium text-slate-700">Klinische Zusammenfassung</h4>
              <div className="mb-6">
                <ClinicalSummaryBlock text={clinicalSummary} />
              </div>
            </>
          )}
          <h4 className="mb-2 font-medium text-slate-700">Wichtige Kennzahlen</h4>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Schritte</p>
          <p className="text-2xl font-semibold">{stepCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cadenz</p>
          <p className="text-2xl font-semibold">
            {cadence != null ? `${cadence.toFixed(1)}/min` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Symmetrie</p>
          <p className="text-2xl font-semibold">
            {sym != null ? `${sym.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Status</p>
          <p className="text-2xl font-semibold">
            {hasAsym ? (
              <span className="text-amber-600">Auffällig</span>
            ) : (
              <span className="text-green-600">Normal</span>
            )}
          </p>
        </div>
      </div>
      {hasAsym && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Asymmetrie erkannt! Ein Symmetrie-Index &gt;10% deutet auf ein auffälliges Gangbild hin.
        </div>
      )}
      {!hasAsym && hasMetrics && (
        <div className="mb-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-800">
          Symmetrischer Gang – Keine signifikante Asymmetrie festgestellt.
        </div>
      )}
      {hasPhaseAsym && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Phasen-Asymmetrie: Swing {(metrics.swing_symmetry_index as number)?.toFixed(1) ?? 0}%, Stance{" "}
          {(metrics.stance_symmetry_index as number)?.toFixed(1) ?? 0}%
        </div>
      )}
      <h4 className="mb-2 mt-6 font-medium text-slate-700">Detaillierte Metriken</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h5 className="mb-2 font-medium text-slate-600">Zeitliche Parameter</h5>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>Schrittzeit links: {(metrics.step_time_left as number)?.toFixed(2) ?? "—"}s</li>
            <li>Schrittzeit rechts: {(metrics.step_time_right as number)?.toFixed(2) ?? "—"}s</li>
            <li>Swing Phase links: {(metrics.swing_phase_left as number)?.toFixed(1) ?? "—"}%</li>
            <li>Swing Phase rechts: {(metrics.swing_phase_right as number)?.toFixed(1) ?? "—"}%</li>
            <li>Stance Phase links: {(metrics.stance_phase_left as number)?.toFixed(1) ?? "—"}%</li>
            <li>Stance Phase rechts: {(metrics.stance_phase_right as number)?.toFixed(1) ?? "—"}%</li>
            <li>Double Support: {(metrics.double_support_percent as number)?.toFixed(1) ?? "—"}%</li>
            <li>Single Support: {(metrics.single_support_percent as number)?.toFixed(1) ?? "—"}%</li>
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h5 className="mb-2 font-medium text-slate-600">Räumliche Parameter</h5>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>Schrittlänge links: {(metrics.step_length_left as number)?.toFixed(1) ?? "—"} cm</li>
            <li>Schrittlänge rechts: {(metrics.step_length_right as number)?.toFixed(1) ?? "—"} cm</li>
            <li>Stride Length: {(metrics.stride_length as number)?.toFixed(1) ?? "—"} cm</li>
            <li>L/R Verhältnis: {(metrics.left_right_ratio as number)?.toFixed(2) ?? "—"}</li>
            <li>Max. Knieflexion: {(metrics.max_knee_flexion as number)?.toFixed(1) ?? "—"}°</li>
            {(metrics.hip_range_of_motion as number) > 0 && (
              <li>Hüft-ROM: {(metrics.hip_range_of_motion as number)?.toFixed(1)}°</li>
            )}
          </ul>
        </div>
      </div>
      {/* Symmetrie-Balken */}
      {(metrics.step_length_left != null || metrics.step_length_right != null) && (
        <div className="mt-6">
          <h4 className="mb-2 font-medium text-slate-700">Schrittlängen-Vergleich</h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: "Links", value: (metrics.step_length_left as number) ?? 0, fill: "#0EA5E9" },
                  { name: "Rechts", value: (metrics.step_length_right as number) ?? 0, fill: "#06B6D4" },
                ]}
                margin={{ top: 8, right: 40, left: 50, bottom: 8 }}
              >
                <CartesianGrid {...CHART_GRID} horizontal={false} />
                <XAxis type="number" unit=" cm" tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, "auto"]} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} width={44} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP.contentStyle} formatter={(v: unknown) => (typeof v === "number" ? `${v.toFixed(1)} cm` : String(v))} />
                <Bar dataKey="value" maxBarSize={28} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#475569", fontSize: 12, formatter: (v: number) => `${v.toFixed(1)} cm` }}>
                  <Cell fill="#0EA5E9" />
                  <Cell fill="#06B6D4" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function TabSymmetrie({ metrics }: { metrics: Record<string, unknown> }) {
  const hasMetrics = Object.keys(metrics).length > 0;
  if (!hasMetrics) {
    return <p className="text-slate-500">Keine Analysedaten für Symmetrie vorhanden.</p>;
  }
  const symIdx = (metrics.symmetry_index as number) ?? 0;
  const leftLen = (metrics.step_length_left as number) ?? 0;
  const rightLen = (metrics.step_length_right as number) ?? 0;
  const swingL = (metrics.swing_phase_left as number) ?? 0;
  const swingR = (metrics.swing_phase_right as number) ?? 0;
  const stanceL = (metrics.stance_phase_left as number) ?? 0;
  const stanceR = (metrics.stance_phase_right as number) ?? 0;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Symmetrie-Analyse</h3>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Detaillierte Links/Rechts-Vergleichsanalyse
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <InfoCard label="Symmetrie-Index" value={`${symIdx.toFixed(1)}%`} />
        <InfoCard label="L/R Verhältnis" value={(metrics.left_right_ratio as number)?.toFixed(2) ?? "—"} />
        <InfoCard label="Swing Symmetrie" value={`${(metrics.swing_symmetry_index as number)?.toFixed(1) ?? 0}%`} />
        <InfoCard label="Stance Symmetrie" value={`${(metrics.stance_symmetry_index as number)?.toFixed(1) ?? 0}%`} />
      </div>
      <h4 className="mb-2 font-medium text-slate-700">Schrittlängen-Vergleich</h4>
      <div className="mb-6 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={[
              { name: "Links", value: leftLen, fill: "#0EA5E9" },
              { name: "Rechts", value: rightLen, fill: "#06B6D4" },
            ]}
            margin={{ top: 8, right: 40, left: 50, bottom: 8 }}
          >
            <CartesianGrid {...CHART_GRID} horizontal={false} />
            <XAxis type="number" unit=" cm" tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, "auto"]} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} width={44} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={CHART_TOOLTIP.contentStyle} formatter={(v: unknown) => (typeof v === "number" ? `${v.toFixed(1)} cm` : String(v))} />
            <Bar dataKey="value" maxBarSize={28} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#475569", fontSize: 12, formatter: (v: number) => `${v.toFixed(1)} cm` }}>
              <Cell fill="#0EA5E9" />
              <Cell fill="#06B6D4" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h4 className="mb-2 font-medium text-slate-700">Gangphasen-Vergleich</h4>
      <div className="mb-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[
              { name: "Links", swing: swingL, stance: stanceL },
              { name: "Rechts", swing: swingR, stance: stanceR },
            ]}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap="40%"
          >
            <CartesianGrid {...CHART_GRID} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis label={{ value: "%", angle: -90, position: "insideLeft", style: { fill: "#64748b" } }} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={CHART_TOOLTIP.contentStyle} formatter={(v: unknown) => (typeof v === "number" ? `${v.toFixed(1)}%` : String(v ?? ""))} />
            <Legend />
            <Bar dataKey="stance" name="Stance (Standphase)" stackId="a" fill="#475569" radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="swing" name="Swing (Schwungphase)" stackId="a" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h4 className="mb-2 font-medium text-slate-700">Interpretation</h4>
      <div className="rounded-lg border p-4">
        {symIdx < 5 && (
          <p className="text-green-700">Exzellente Symmetrie – Abweichung unter 5%</p>
        )}
        {symIdx >= 5 && symIdx < 10 && (
          <p className="text-sky-700">Leichte Asymmetrie – Abweichung 5–10%, möglicherweise klinisch relevant</p>
        )}
        {symIdx >= 10 && symIdx < 20 && (
          <p className="text-amber-700">Moderate Asymmetrie – Abweichung 10–20%, weitere Untersuchung empfohlen</p>
        )}
        {symIdx >= 20 && (
          <p className="text-red-700">Starke Asymmetrie – Abweichung über 20%, klinische Bewertung erforderlich</p>
        )}
      </div>
    </div>
  );
}

function TabExport({
  session,
  frames,
  metrics,
  token,
}: {
  session: MovementSession;
  frames: KeypointFrame[];
  metrics: Record<string, unknown>;
  token?: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const API_BASE =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : "";

  const handlePdfDownload = async () => {
    if (!token) return;
    setPdfError(null);
    setPdfLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/movement/sessions/${session.id}/pdf-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text() || "PDF konnte nicht geladen werden");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date(session.created_at).toISOString().slice(0, 10);
      a.download = `Ganganalyse_${dateStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = (format: "json-kp" | "json-analysis" | "csv") => {
    let blob: Blob;
    let filename: string;
    let mime: string;
    const baseName = `Ganganalyse_${new Date(session.created_at).toISOString().slice(0, 10)}`;

    if (format === "json-kp") {
      blob = new Blob([jsonKpStr], { type: "application/json" });
      filename = `${baseName}_keypoints.json`;
      mime = "application/json";
    } else if (format === "json-analysis") {
      const data = JSON.stringify(metrics, null, 2);
      blob = new Blob([data], { type: "application/json" });
      filename = `${baseName}_analysis.json`;
      mime = "application/json";
    } else {
      const rows = [
        ["Metrik", "Wert", "Einheit"],
        ["Schritte", String(metrics.step_count ?? 0), "-"],
        ["Cadenz", `${(metrics.cadence as number)?.toFixed(1) ?? 0}`, "Schritte/min"],
        ["Symmetrie-Index", `${(metrics.symmetry_index as number)?.toFixed(1) ?? 0}`, "%"],
        ["Schrittlänge Links", `${(metrics.step_length_left as number)?.toFixed(1) ?? 0}`, "cm"],
        ["Schrittlänge Rechts", `${(metrics.step_length_right as number)?.toFixed(1) ?? 0}`, "cm"],
      ];
      const csv = rows.map((r) => r.join(";")).join("\n");
      blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      filename = `${baseName}_metrics.csv`;
      mime = "text/csv";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const jsonKpStr = JSON.stringify(
    { metadata: { session_id: session.id, fps: session.fps }, keypoints: frames },
    null,
    2
  );
  const jsonKpSize = new Blob([jsonKpStr]).size / 1024;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Export</h3>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Daten exportieren für weitere Verarbeitung
      </div>
      <div className="flex flex-wrap gap-4">
        {session.status === "completed" && (
          <div>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={!token || pdfLoading}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {pdfLoading ? "Lade…" : "PDF-Bericht"}
            </button>
            {pdfError && <p className="mt-1 text-xs text-red-600">{pdfError}</p>}
          </div>
        )}
        <div>
          <button
            onClick={() => handleDownload("json-kp")}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            JSON (Keypoints)
          </button>
          <p className="mt-1 text-xs text-slate-500">Dateigröße: {jsonKpSize.toFixed(1)} KB</p>
        </div>
        <button
          onClick={() => handleDownload("json-analysis")}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          JSON (Analyse)
        </button>
        <button
          onClick={() => handleDownload("csv")}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          CSV (Metriken)
        </button>
      </div>
    </div>
  );
}

function TabStatistik({
  frames,
  totalFrames,
  fps,
  duration,
}: {
  frames: KeypointFrame[];
  totalFrames: number;
  fps: number;
  duration: number;
}) {
  const kpPerFrame = frames.map((f) => f.keypoints?.length ?? 0);
  const avgKp = kpPerFrame.length
    ? kpPerFrame.reduce((a, b) => a + b, 0) / kpPerFrame.length
    : 0;
  const allConf: number[] = [];
  frames.forEach((f) => {
    f.keypoints?.forEach((kp) => {
      if (kp[2] != null) allConf.push(kp[2]);
    });
  });
  const avgConf = allConf.length
    ? allConf.reduce((a, b) => a + b, 0) / allConf.length
    : 0;

  const lineData = kpPerFrame.map((v, i) => ({ frame: i, count: v }));

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-700">Statistiken</h3>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <InfoCard label="Frames gesamt" value={String(totalFrames)} />
        <InfoCard label="FPS" value={fps.toFixed(1)} />
        <InfoCard label="Dauer" value={`${duration.toFixed(2)}s`} />
        <InfoCard label="Ø Keypoints/Frame" value={avgKp.toFixed(1)} />
        <InfoCard
          label="Max Keypoints"
          value={String(kpPerFrame.length ? Math.max(...kpPerFrame) : 0)}
        />
      </div>
      {allConf.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <InfoCard label="Ø Confidence" value={avgConf.toFixed(2)} />
          <InfoCard label="Min Confidence" value={Math.min(...allConf).toFixed(2)} />
          <InfoCard label="Max Confidence" value={Math.max(...allConf).toFixed(2)} />
        </div>
      )}
      {lineData.length > 0 && (
        <>
          <h4 className="mb-2 text-sm font-medium text-slate-600">
            Keypoint-Erkennungsrate pro Frame
          </h4>
          <div className="mb-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="frame" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis label={{ value: "Keypoints", angle: -90, position: "insideLeft", style: { fill: "#64748b" } }} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP.contentStyle} />
                <Line type="monotone" dataKey="count" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
      {allConf.length > 0 && (
        <>
          <h4 className="mb-2 text-sm font-medium text-slate-600">
            Confidence-Verteilung
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={binConfidence(allConf, 20)}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="bin" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis label={{ value: "Häufigkeit", angle: -90, position: "insideLeft", style: { fill: "#64748b" } }} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP.contentStyle} />
                <Bar dataKey="count" fill="#0EA5E9" maxBarSize={24} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function binConfidence(values: number[], bins: number): { bin: string; count: number }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) return [{ bin: min.toFixed(2), count: values.length }];
  const step = (max - min) / bins || 0.01;
  const hist: number[] = new Array(bins).fill(0);
  values.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / step), bins - 1);
    hist[idx]++;
  });
  return hist.map((count, i) => ({
    bin: (min + (i + 0.5) * step).toFixed(2),
    count,
  }));
}
