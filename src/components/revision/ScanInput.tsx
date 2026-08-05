import { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Keyboard, X, Flashlight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { extractInventoryCode, playScanFeedback, ScanFeedback } from "@/lib/scanUtils";
import { cn } from "@/lib/utils";

interface ScanInputProps {
  onScan: (code: string, feedback: ScanFeedback) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Tiempo mínimo antes de volver a aceptar el MISMO código detectado por la
// cámara: evita que, si la etiqueta sigue frente al lente tras un escaneo,
// se dispare de nuevo el mismo código en el siguiente frame decodificado.
const SAME_CODE_COOLDOWN_MS = 2000;
// Pausa breve tras un escaneo exitoso antes de reanudar la detección: solo
// el tiempo justo para el flash visual/sonoro, sin cerrar la cámara — así
// el escaneo es continuo (no hay que reabrirla para cada bien).
const RESUME_SCAN_DELAY_MS = 350;

export function ScanInput({ onScan, autoFocus = true, disabled = false }: ScanInputProps) {
  const [manualInput, setManualInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [detected, setDetected] = useState(false);
  const [sessionScanCount, setSessionScanCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeAtRef = useRef(0);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  // Escaneo manual / lector físico tipo "keyboard wedge": el lector escribe
  // el código completo y termina con Enter, así que se procesa de inmediato
  // (un debounce aquí solo agrega latencia sin ningún beneficio real).
  const handleManualScan = useCallback(() => {
    if (!manualInput.trim()) return;
    const code = extractInventoryCode(manualInput);
    if (code) {
      const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
      onScan(normalized, "ok");
      setManualInput("");
      if (inputRef.current) inputRef.current.focus();
      if (navigator.vibrate) navigator.vibrate(40);
    }
  }, [manualInput, onScan]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleManualScan(); }
  };

  const startCamera = async () => {
    isProcessingRef.current = false;
    lastCodeRef.current = null;
    lastCodeAtRef.current = 0;
    if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
    if (controlsRef.current) { controlsRef.current.stop(); controlsRef.current = null; }
    setCameraOpen(true);
    setCameraError(null);
    setDetected(false);
    setSessionScanCount(0);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!videoRef.current) throw new Error("Video element not found");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Escaneo continuo: la cámara permanece abierta entre lecturas — no
      // hay que reabrirla para cada bien. Si se cerrara y reabriera por
      // cada código (como antes), es fácil que el lente siga apuntando a
      // la etiqueta anterior al reabrir y esta se vuelva a leer, dando la
      // sensación de que "detectó el QR anterior".
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (isProcessingRef.current) return;
        if (result) {
          const code = extractInventoryCode(result.getText());
          if (code) {
            const now = Date.now();
            const isSameRecentCode =
              lastCodeRef.current === code && now - lastCodeAtRef.current < SAME_CODE_COOLDOWN_MS;
            if (isSameRecentCode) return; // misma etiqueta aún frente al lente: ignorar en silencio

            isProcessingRef.current = true;
            lastCodeRef.current = code;
            lastCodeAtRef.current = now;

            playScanFeedback("ok");
            if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
            setDetected(true);
            onScan(code, "ok");
            setSessionScanCount((c) => c + 1);

            resumeTimeoutRef.current = setTimeout(() => {
              setDetected(false);
              isProcessingRef.current = false;
            }, RESUME_SCAN_DELAY_MS);
          }
        }
        if (error && error.name !== "NotFoundException") console.error("Scan error:", error);
      });
      controlsRef.current = controls;
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const caps = track.getCapabilities() as any;
      if (caps.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchEnabled } as any] });
        setTorchEnabled(!torchEnabled);
      }
    } catch (err) { console.error("Torch error:", err); }
  };

  const stopCamera = () => {
    if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
    if (controlsRef.current) { controlsRef.current.stop(); controlsRef.current = null; }
    readerRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    isProcessingRef.current = false;
    lastCodeRef.current = null;
    setCameraOpen(false);
    setCameraError(null);
    setTorchEnabled(false);
    setDetected(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="space-y-3">
      {/* Manual input row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Escanea o escribe el número de inventario"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pl-10 h-11 text-base md:text-sm rounded-xl"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            inputMode="text"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          disabled={disabled || cameraOpen}
          className="h-11 px-4 rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline font-semibold">Cámara</span>
        </Button>
      </div>

      {/* Camera overlay dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-full max-h-full h-[100dvh] m-0 p-0 rounded-none border-0 bg-black [&>button]:hidden">

          {/* Inline styles for sweep animation */}
          <style>{`
            @keyframes scan-sweep {
              0%   { top: 6%;  opacity: 1; }
              46%  { top: 91%; opacity: 1; }
              50%  { top: 91%; opacity: 0; }
              54%  { top: 6%;  opacity: 0; }
              100% { top: 6%;  opacity: 1; }
            }
            .scan-sweep { animation: scan-sweep 2.2s ease-in-out infinite; }
          `}</style>

          {/* Video feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            autoPlay
          />

          {/* Camera error overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center z-20 p-6">
              <div className="bg-black/80 backdrop-blur-lg rounded-2xl p-6 text-center text-white max-w-xs">
                <QrCode className="h-10 w-10 mx-auto mb-3 text-red-400" />
                <p className="font-bold mb-1">Sin acceso a la cámara</p>
                <p className="text-sm text-white/70 mb-4">{cameraError}</p>
                <Button onClick={stopCamera} variant="outline" className="text-white border-white/30">
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* Overlay mask + scan frame */}
          {!cameraError && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* Dark mask using box-shadow on the transparent scan frame */}
              <div
                className={cn(
                  "absolute transition-all duration-300",
                  detected
                    ? "shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    : "shadow-[0_0_0_9999px_rgba(0,0,0,0.72)]"
                )}
                style={{
                  top: "calc(50% - 130px)",
                  left: "calc(50% - 130px)",
                  width: "260px",
                  height: "260px",
                  borderRadius: "6px",
                }}
              >
                {/* Detect flash */}
                {detected && (
                  <div className="absolute inset-0 bg-emerald-400/50 rounded-md animate-in fade-in duration-75" />
                )}

                {/* Corner brackets */}
                {[
                  "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br",
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute w-7 h-7 transition-colors duration-300",
                      cls,
                      detected ? "border-emerald-400" : "border-white"
                    )}
                  />
                ))}

                {/* Sweep line */}
                {!detected && (
                  <div
                    className="scan-sweep absolute left-2 right-2 h-[2px] rounded-full pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, transparent, #38bdf8 30%, #7dd3fc, #38bdf8 70%, transparent)",
                      boxShadow: "0 0 6px #38bdf8, 0 0 14px rgba(56,189,248,0.35)",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: "12px" }}
          >
            <Button
              onClick={stopCamera}
              variant="ghost"
              size="icon"
              className="text-white bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-full h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-white text-sm font-semibold">
                {detected ? "✓ Código detectado" : "Escaneo continuo"}
              </span>
              {sessionScanCount > 0 && (
                <span className="bg-emerald-500/90 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {sessionScanCount}
                </span>
              )}
            </div>
            <Button
              onClick={toggleTorch}
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full h-10 w-10 backdrop-blur-sm",
                torchEnabled
                  ? "text-amber-400 bg-amber-400/20"
                  : "text-white bg-black/40 hover:bg-black/60"
              )}
            >
              <Flashlight className="h-5 w-5" />
            </Button>
          </div>

          {/* Bottom instruction */}
          {!cameraError && (
            <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
              <p className={cn(
                "text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm transition-colors duration-300",
                detected
                  ? "bg-emerald-500/80 text-white"
                  : "bg-black/50 text-white/80"
              )}>
                {detected ? "¡Listo! Apunta al siguiente código" : "Apunta el código QR al recuadro"}
              </p>
              <Button
                onClick={stopCamera}
                variant="outline"
                className="pointer-events-auto border-white/30 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full px-6"
              >
                Terminar escaneo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
