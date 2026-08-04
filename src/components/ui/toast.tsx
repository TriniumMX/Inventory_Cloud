import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-20 right-4 z-[100] flex max-h-screen w-full flex-col gap-2 p-0 md:max-w-[400px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border p-4 pr-10 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
  {
    variants: {
      variant: {
        default: "bg-[#0b1c4c] border-[#38bdf8]/20 text-zinc-100 shadow-[0_0_25px_rgba(56,189,248,0.15),0_8px_32px_rgba(0,0,0,0.8)]",
        destructive: "bg-[#0b1c4c] border-[#f97316]/25 text-zinc-100 shadow-[0_0_25px_rgba(249,115,22,0.15),0_8px_32px_rgba(0,0,0,0.8)]",
        success: "bg-[#0b1c4c] border-[#34d399]/20 text-zinc-100 shadow-[0_0_25px_rgba(52,211,153,0.15),0_8px_32px_rgba(0,0,0,0.8)]",
        warning: "bg-[#0b1c4c] border-[#facc15]/20 text-zinc-100 shadow-[0_0_25px_rgba(250,204,21,0.15),0_8px_32px_rgba(0,0,0,0.8)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {children}
      
      {/* Wave SVG Effect in the background of the Toast */}
      <svg
        viewBox="0 0 1440 200"
        className={cn(
          "absolute bottom-0 left-0 w-full h-[40px] pointer-events-none select-none z-0",
          variant === "destructive" && "text-orange-500",
          variant === "success" && "text-emerald-500",
          variant === "warning" && "text-yellow-500",
          variant === "default" && "text-sky-500"
        )}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Layer 1 (Back wave) */}
        <path
          fill="currentColor"
          className="opacity-[0.08]"
          d="M0,96 C240,160 480,160 720,128 C960,96 1200,32 1440,64 L1440,200 L0,200 Z"
        />
        {/* Layer 2 (Front wave) */}
        <path
          fill="currentColor"
          className="opacity-[0.14]"
          d="M0,128 C360,64 720,160 1080,96 C1260,64 1350,96 1440,112 L1440,200 L0,200 Z"
        />
      </svg>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-3 text-xs font-semibold ring-offset-background transition-colors hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 relative z-10",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 focus:outline-none transition-colors z-20",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold leading-none", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-xs leading-normal", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
