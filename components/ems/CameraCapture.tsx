"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RotateCcw, Check, X, MapPin, Clock, Building2, Home, Loader2 } from "lucide-react";

export interface ClockCaptureResult {
  photo: string;
  coords?: { lat: number; lng: number };
  timezone?: string;
  wfh: boolean;
}

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (result: ClockCaptureResult) => void;
}

type GeoStatus = "locating" | "ok" | "error";

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"preview" | "captured">("preview");
  const [capturedImage, setCapturedImage] = useState("");
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [wfh, setWfh] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("locating");
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setPhase("preview");
      setCapturedImage("");
      setCapturedAt(null);
      setCameraError("");
      setWfh(false);
      setCoords(undefined);
      setGeoStatus("locating");
      return;
    }

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) setCameraError("Camera access denied. Please allow camera permission and try again.");
      }
    }

    // Grab a location fix up front so it's ready to show under the selfie.
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => { if (!cancelled) setGeoStatus("error"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    startCamera();
    return () => { cancelled = true; stopStream(); };
  }, [open, stopStream]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    setCapturedAt(new Date());
    setPhase("captured");
    stopStream();
  }

  const restartCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.");
    }
  }, []);

  function retake() {
    setPhase("preview");
    setCapturedImage("");
    setCapturedAt(null);
    // `open` hasn't changed, so the mount effect won't re-run — restart the stream manually
    restartCamera();
  }

  function confirm() {
    onCapture({ photo: capturedImage, coords, timezone: tz, wfh });
    onClose();
  }

  if (!open) return null;

  const WfhToggle = (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-2)] p-1 text-xs font-medium">
      <button
        type="button"
        onClick={() => setWfh(false)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${!wfh ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
      >
        <Building2 size={14} /> In office
      </button>
      <button
        type="button"
        onClick={() => setWfh(true)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${wfh ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)]"}`}
      >
        <Home size={14} /> Work from home
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)]" aria-label="Close">
          <X size={18} />
        </button>

        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <Camera size={20} />
          </div>
          <h3 className="text-sm font-semibold">Take a selfie</h3>
          <p className="text-xs text-[var(--muted)]">Required for clock-in verification</p>
        </div>

        {cameraError ? (
          <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{cameraError}</div>
        ) : phase === "preview" ? (
          <div className="space-y-3">
            {WfhToggle}
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" style={{ transform: "scaleX(-1)" }} />
              <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4">
                <button onClick={capturePhoto} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg transition-transform hover:scale-105 active:scale-95" aria-label="Capture">
                  <div className="h-11 w-11 rounded-full border-2 border-gray-900" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl">
              <img src={capturedImage} alt="Clock-in selfie" className="w-full" style={{ transform: "scaleX(-1)" }} />
            </div>

            {/* Verified details captured with the selfie */}
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Clock size={14} className="shrink-0 text-[var(--muted-2)]" />
                <span className="font-medium text-[var(--foreground)]">
                  {capturedAt?.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <MapPin size={14} className="shrink-0 text-[var(--muted-2)]" />
                {geoStatus === "locating" ? (
                  <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Getting your location…</span>
                ) : geoStatus === "ok" && coords ? (
                  <span className="font-medium text-[var(--foreground)]">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}{tz ? ` · ${tz}` : ""}
                  </span>
                ) : (
                  <span className="text-[var(--danger)]">Location unavailable</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)]">
                {wfh ? <Home size={14} className="shrink-0 text-[var(--muted-2)]" /> : <Building2 size={14} className="shrink-0 text-[var(--muted-2)]" />}
                <span className="font-medium text-[var(--foreground)]">{wfh ? "Work from home" : "In office"}</span>
              </div>
            </div>

            {WfhToggle}

            <div className="flex gap-2">
              <button onClick={retake} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] text-sm font-medium hover:bg-[var(--surface-2)]">
                <RotateCcw size={15} /> Retake
              </button>
              <button onClick={confirm} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white hover:opacity-90">
                <Check size={15} /> Confirm
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
