import { useState, useCallback, useRef } from "react";

let showToastFn: ((msg: string) => void) | null = null;

export function showToast(msg: string) {
  showToastFn?.(msg);
}

export function ToastContainer() {
  const [toast, setToast] = useState<{ msg: string; visible: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, visible: true });

    timerRef.current = setTimeout(() => {
      setToast((t) => (t ? { ...t, visible: false } : null));
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, 200);
    }, 2200);
  }, []);

  showToastFn = show;

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div className={`toast${toast.visible ? " toast-visible" : ""}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {toast.msg}
      </div>
    </div>
  );
}
