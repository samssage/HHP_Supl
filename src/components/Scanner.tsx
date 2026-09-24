"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Called once per detected code. Same code is ignored for a moment so one sticker = one scan. */
  onCode: (code: string) => void;
  /** Keep scanning after a hit (room counts) or stop after the first (lookups). */
  continuous?: boolean;
  label?: string;
};

let detectorPromise: Promise<{ detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> }> | null = null;

function getDetector() {
  detectorPromise ??= import("barcode-detector/ponyfill").then(({ BarcodeDetector, prepareZXingModule }) => {
    // Served from /public so scanning works in rooms with bad signal.
    prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/${path}` : prefix + path) },
    });
    return new BarcodeDetector();
  });
  return detectorPromise;
}

export function Scanner({ onCode, continuous = false, label = "Scan a code" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onCodeRef = useRef(onCode);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const detector = await getDetector();

        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const found = await detector.detect(video);
              const code = found[0]?.rawValue?.trim();
              const last = lastRef.current;
              if (code && !(last && last.code === code && Date.now() - last.at < 2000)) {
                lastRef.current = { code, at: Date.now() };
                navigator.vibrate?.(60);
                setFlash(code);
                onCodeRef.current(code);
                if (!continuous) {
                  setActive(false);
                  return;
                }
              }
            }
          } catch {
            // A bad frame — keep going.
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access for this site, or type the code below."
            : "Couldn’t open the camera on this device. Type the code below instead.",
        );
        setActive(false);
      }
    }
    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active, continuous]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="space-y-2">
      {active ? (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          {flash && (
            <div className="absolute inset-x-0 bottom-0 bg-good px-3 py-2 text-sm font-medium text-white">
              Scanned: <span className="font-mono">{flash}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setActive(false)}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-3 py-1.5 text-sm text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setActive(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-brand-ink"
        >
          <CameraIcon /> {label}
        </button>
      )}
      {error && <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onCodeRef.current(manual.trim());
          setManual("");
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="…or type a code / item ID"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        <button className="rounded-md border border-line bg-surface px-3 text-sm">Enter</button>
      </form>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 7h3l2-3h8l2 3h3v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
