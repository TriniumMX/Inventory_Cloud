import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = "default", ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3.5 items-center flex-1 min-w-0 self-stretch relative z-10">
              {/* Vertical accent bar with rounded caps stretching to parent height */}
              <div
                className={cn(
                  "w-[3px] self-stretch rounded-full shrink-0 my-0.5",
                  variant === "destructive" && "bg-orange-500",
                  variant === "success" && "bg-[#10b981]",
                  variant === "warning" && "bg-yellow-400",
                  variant === "default" && "bg-sky-400"
                )}
              />

              {/* Text Container - inline title & description */}
              <div className="flex-1 text-xs sm:text-[13px] leading-relaxed text-zinc-100 min-w-0 pr-2 py-0.5">
                {title && (
                  <span
                    className={cn(
                      "font-bold mr-1.5",
                      variant === "destructive" && "text-orange-400",
                      variant === "success" && "text-[#10b981]",
                      variant === "warning" && "text-yellow-400",
                      variant === "default" && "text-sky-400"
                    )}
                  >
                    {title}:
                  </span>
                )}
                {description && <span className="text-zinc-300 font-medium">{description}</span>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
