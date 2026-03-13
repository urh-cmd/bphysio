"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

// YOLOv8/COCO Skeleton – wie Streamlit video_player: Links Blau, Rechts Magenta, Mitte Cyan
type SkeletonEdge = [number, number, "left" | "right" | "center"];
const SKELETON: SkeletonEdge[] = [
  [0, 1, "left"], [0, 2, "right"], [1, 3, "left"], [2, 4, "right"],
  [5, 6, "center"],
  [5, 7, "left"], [7, 9, "left"], [6, 8, "right"], [8, 10, "right"],
  [5, 11, "left"], [6, 12, "right"], [11, 12, "center"],
  [11, 13, "left"], [13, 15, "left"], [12, 14, "right"], [14, 16, "right"],
];

const COLORS = {
  left: "rgba(0, 150, 255, 0.95)",
  right: "rgba(255, 80, 180, 0.95)",
  center: "rgba(0, 230, 230, 0.95)",
  kpHigh: "rgba(0, 230, 118, 1)",
  kpMid: "rgba(255, 214, 0, 1)",
  kpLow: "rgba(255, 90, 90, 1)",
};

type KeypointFrame = { frame: number; timestamp: number; keypoints: [number, number, number][] };

function buildFrameLookup(frames: KeypointFrame[]): (videoFrame: number) => [number, number, number][] | null {
  if (!frames.length) return () => null;
  const kpList = frames.map((f) => f.keypoints ?? []);
  const frameNums = frames.map((f) => f.frame);
  const maxFrame = Math.max(...frameNums, 0);

  const getIdx = (vf: number): number => {
    if (vf <= frameNums[0]) return 0;
    if (vf >= frameNums[frameNums.length - 1]) return frameNums.length - 1;
    let lo = 0;
    let hi = frameNums.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (frameNums[mid] <= vf) lo = mid;
      else hi = mid;
    }
    return Math.abs(frameNums[lo] - vf) <= Math.abs(frameNums[hi] - vf) ? lo : hi;
  };

  const lastKp = kpList[kpList.length - 1] ?? null;
  return (videoFrame: number) => {
    if (videoFrame < 0) return null;
    if (videoFrame > maxFrame) return lastKp;
    const idx = getIdx(videoFrame);
    return kpList[idx] ?? null;
  };
}

export function PoseVideoPlayer({
  sessionId,
  token,
  frames,
  fps,
  minConfidence = 0.5,
}: {
  sessionId: string;
  token: string | null;
  frames: KeypointFrame[];
  fps: number;
  minConfidence?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const lastFrameRef = useRef<number>(-1);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getKeypointsForVideoFrame = useMemo(() => buildFrameLookup(frames), [frames]);

  useEffect(() => {
    if (!token || !sessionId) return;
    const url = `${API_BASE}/api/movement/sessions/${sessionId}/video`;
    setLoading(true);
    setError(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.blob();
      })
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setVideoUrl(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Video konnte nicht geladen werden"))
      .finally(() => setLoading(false));
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [sessionId, token]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoUrl || !frames.length) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    const drawPose = () => {
      if (canvas.width === 0 || canvas.height === 0) return;
      const videoFrame = Math.floor(video.currentTime * fps);
      if (videoFrame < 0) return;
      const kps = getKeypointsForVideoFrame(videoFrame);
      if (!kps?.length) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const cw = canvas.width;
      const ch = canvas.height;
      scale = Math.min(cw / vw, ch / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      offsetX = (cw - drawW) / 2;
      offsetY = (ch - drawH) / 2;

      ctx.clearRect(0, 0, cw, ch);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      for (const [i, j, side] of SKELETON) {
        if (i >= kps.length || j >= kps.length) continue;
        const a = kps[i];
        const b = kps[j];
        if (!a || !b || (a[2] ?? 0) < minConfidence || (b[2] ?? 0) < minConfidence) continue;
        ctx.strokeStyle = COLORS[side];
        ctx.beginPath();
        ctx.moveTo(offsetX + a[0] * scale, offsetY + a[1] * scale);
        ctx.lineTo(offsetX + b[0] * scale, offsetY + b[1] * scale);
        ctx.stroke();
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < kps.length; i++) {
        const k = kps[i];
        if (!k || (k[2] ?? 0) < minConfidence) continue;
        const conf = k[2] ?? 1;
        ctx.fillStyle = conf >= 0.8 ? COLORS.kpHigh : conf >= 0.5 ? COLORS.kpMid : COLORS.kpLow;
        const x = offsetX + k[0] * scale;
        const y = offsetY + k[1] * scale;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const resizeCanvas = () => {
      const w = video.offsetWidth;
      const h = video.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastFrameRef.current = -1;
        drawPose();
      }
    };

    let rafId: number;
    const loop = () => {
      const videoFrame = Math.floor(video.currentTime * fps);
      if (videoFrame !== lastFrameRef.current) {
        lastFrameRef.current = videoFrame;
        drawPose();
      }
      if (!video.paused && !video.ended) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const onPlay = () => {
      lastFrameRef.current = -1;
      loop();
    };
    const onPause = () => {
      cancelAnimationFrame(rafId);
      drawPose();
    };
    const onSeeked = () => {
      lastFrameRef.current = -1;
      drawPose();
    };

    video.addEventListener("loadedmetadata", resizeCanvas);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", resizeCanvas);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [videoUrl, frames.length, getKeypointsForVideoFrame, fps, minConfidence]);

  const seek = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-slate-500">Video wird geladen…</p>
      </div>
    );
  }
  if (error || !videoUrl) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <p className="text-amber-800">{error ?? "Video nicht verfügbar."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="block max-w-full object-contain"
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: "100%", height: "100%", willChange: "transform", transform: "translateZ(0)" }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = 0;
          }}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => seek(-10)}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          -10s
        </button>
        <button
          type="button"
          onClick={() => seek(-1)}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          -1s
        </button>
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) v.play();
            else v.pause();
          }}
          className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Play / Pause
        </button>
        <button
          type="button"
          onClick={() => seek(1)}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          +1s
        </button>
        <button
          type="button"
          onClick={() => seek(10)}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          +10s
        </button>
        <button
          type="button"
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration;
          }}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          Ende
        </button>
      </div>

      <div className="text-center text-sm text-slate-500">
        Min. Confidence: {minConfidence} · Frame / Zeit wird im Video-Player angezeigt
      </div>
    </div>
  );
}
