import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import type { ComponentProps } from "react";

type ToasterProps = ComponentProps<typeof Sonner>;

function SileoIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: color }}
    >
      {children}
    </div>
  );
}

const TOAST_CLASSES = [
  "group flex items-center gap-3 w-full",
  "px-3.5 py-3 rounded-[22px]",
  "border border-white/[0.09]",
  "shadow-[0_12px_48px_rgba(0,0,0,0.6),0_3px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
  "min-w-[240px] max-w-[85vw] sm:max-w-[380px]",
  "cursor-default select-none",
].join(" ");

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <>
      {/*
        Sonner usa --offset para AMBOS ejes (top y right) con el mismo valor.
        Sobreescribimos top con safe-area-inset-top para que quede
        justo debajo del notch en modo PWA, y right fijo en 12px.
      */}
      <style>{`
        [data-sonner-toaster][data-y-position='top'] {
          top: calc(env(safe-area-inset-top, 0px) + 10px) !important;
        }
        [data-sonner-toaster][data-x-position='right'] {
          right: 12px !important;
          left: auto !important;
        }
      `}</style>

      <Sonner
        position="top-right"
        offset={12}
        expand={false}
        visibleToasts={5}
        gap={10}
        richColors={false}
        closeButton={false}
        duration={3800}
        icons={{
          success: (
            <SileoIcon color="rgba(16,185,129,0.18)">
              <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />
            </SileoIcon>
          ),
          error: (
            <SileoIcon color="rgba(239,68,68,0.18)">
              <XCircle className="h-[18px] w-[18px] text-red-400" />
            </SileoIcon>
          ),
          warning: (
            <SileoIcon color="rgba(245,158,11,0.18)">
              <AlertTriangle className="h-[18px] w-[18px] text-amber-400" />
            </SileoIcon>
          ),
          info: (
            <SileoIcon color="rgba(59,130,246,0.18)">
              <Info className="h-[18px] w-[18px] text-blue-400" />
            </SileoIcon>
          ),
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:   `${TOAST_CLASSES} bg-[#0e1120]/92 backdrop-blur-2xl`,
            success: `${TOAST_CLASSES} bg-[#0b1a14]/92 backdrop-blur-2xl border-emerald-500/20`,
            error:   `${TOAST_CLASSES} bg-[#1a0d0d]/92 backdrop-blur-2xl border-red-500/20`,
            warning: `${TOAST_CLASSES} bg-[#1a150a]/92 backdrop-blur-2xl border-amber-500/20`,
            info:    `${TOAST_CLASSES} bg-[#0a1020]/92 backdrop-blur-2xl border-blue-500/20`,
            title:       "text-[13.5px] font-bold text-white/95 leading-snug tracking-tight",
            description: "text-[11.5px] text-white/50 leading-snug mt-0.5",
            icon:        "shrink-0",
            content:     "flex flex-col flex-1 min-w-0",
            closeButton: "hidden",
            actionButton:"hidden",
          },
        }}
        {...props}
      />
    </>
  );
};

export { Toaster };
