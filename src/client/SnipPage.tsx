import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function SaveIndicator({ state }: { state: AutosaveState }) {
  if (state.status === "saving") {
    return (
      <span style={{ color: "#888", fontSize: "0.875rem" }}>Saving…</span>
    );
  }
  if (state.status === "saved") {
    return (
      <span style={{ color: "green", fontSize: "0.875rem" }}>
        Saved ✓ {formatTimestamp(state.timestamp)}
      </span>
    );
  }
  if (state.status === "offline") {
    return (
      <span style={{ color: "#c0392b", fontSize: "0.875rem" }}>Offline ⚠</span>
    );
  }
  return null;
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";

  const [content, setContent] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep a stable ref to the controller so we can call onChange
  const controllerRef = useRef<AutosaveController | null>(null);

  // Create / re-create the controller whenever the slug changes
  useEffect(() => {
    const controller = new AutosaveController({
      fetch: (url, init) => fetch(url, init),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      dateNow: () => Date.now(),
      url: `/api/snips/${encodeURIComponent(slug)}`,
    });

    controllerRef.current = controller;

    const unsub = controller.subscribe((state) => {
      setSaveState(state);
    });

    return () => {
      unsub();
      controllerRef.current = null;
    };
  }, [slug]);

  // Load content from the server on mount / slug change
  useEffect(() => {
    setContent("");
    setLoadError(false);

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (data) setContent(data.content);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [slug]);

  function handleChange(text: string) {
    setContent(text);
    controllerRef.current?.onChange(text);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid #ddd",
          background: "#fafafa",
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: "1rem" }}>snippaste</strong>
        <span style={{ color: "#888", fontSize: "0.875rem" }}>/s/{slug}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {loadError && (
            <span style={{ color: "red", fontSize: "0.875rem" }}>Load error</span>
          )}
          <SaveIndicator state={saveState} />
        </div>
      </header>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing…"
        style={{
          flex: 1,
          width: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          padding: "1rem",
          fontSize: "1rem",
          fontFamily: "monospace",
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}
