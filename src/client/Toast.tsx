import { useEffect, useState } from "react";

let toastListener: ((msg: string) => void) | null = null;

export function showToast(msg: string): void {
  toastListener?.(msg);
}

export function Toast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    toastListener = (newMsg: string) => {
      setMsg(newMsg);
      setLeaving(false);
      setVisible(true);
      window.clearTimeout((Toast as unknown as { _t?: number })._t);
      const t = window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 200);
      }, 2200);
      (Toast as unknown as { _t?: number })._t = t;
    };
    return () => {
      toastListener = null;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`toast${leaving ? " toast--leaving" : ""}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {msg}
    </div>
  );
}
