import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon } from "./Icon.js";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastTimer: number | null = null;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const value = useMemo<ToastContextValue>(() => ({
    showToast(next) {
      setMessage(next);
      if (toastTimer !== null) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setMessage(null), 2200);
    },
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && <div className="toast" role="status"><Icon name="check" size={13} />{message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
