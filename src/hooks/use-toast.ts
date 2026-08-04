import * as React from "react";
import {
  playNotificationSuccess,
  playNotificationError,
  playNotificationWarning,
  playNotificationInfo,
} from "@/lib/scanUtils";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST;
      toast: Partial<ToasterToast>;
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST;
      toastId?: string;
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST;
      toastId?: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "destructive" | "default" | "success" | "warning";
  duration?: number;
  action?: React.ReactNode;
}

type ToastType = "success" | "error" | "warning" | "info";

function resolveType(opts: ToastOptions): ToastType {
  if (opts.variant === "destructive") return "error";
  if (opts.variant === "success") return "success";
  if (opts.variant === "warning") return "warning";
  const t = typeof opts.title === "string" ? opts.title.toLowerCase() : "";
  if (t.startsWith("error") || t.includes("falló") || t.includes("fallo")) return "error";
  if (t.includes("advertencia") || t.includes("atención") || t.includes("cuidado")) return "warning";
  if (t.includes("próximamente") || t.includes("pausada") || t.includes("información")) return "info";
  return "success";
}

function playSound(type: ToastType) {
  try {
    switch (type) {
      case "error":   playNotificationError();   break;
      case "warning": playNotificationWarning(); break;
      case "info":    playNotificationInfo();    break;
      default:        playNotificationSuccess(); break;
    }
  } catch (_) { /* silencioso si no hay AudioContext */ }
}

function toast({ duration, ...props }: ToastOptions) {
  const id = genId();
  const type = resolveType(props);
  playSound(type);

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

// Métodos directos
toast.success = (title: string, opts?: { description?: string; duration?: number }) => {
  playSound("success");
  return toast({ title, variant: "success", ...opts });
};

toast.error = (title: string, opts?: { description?: string; duration?: number }) => {
  playSound("error");
  return toast({ title, variant: "destructive", ...opts });
};

toast.warning = (title: string, opts?: { description?: string; duration?: number }) => {
  playSound("warning");
  return toast({ title, variant: "warning", ...opts });
};

toast.info = (title: string, opts?: { description?: string; duration?: number }) => {
  playSound("info");
  return toast({ title, variant: "default", ...opts });
};

toast.dismiss = (toastId?: string) => {
  dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
};

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
