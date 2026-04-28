import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";

  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load content from the server on mount / slug change
  useEffect(() => {
    setContent("");
    setStatus("idle");

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
        setStatus("error");
      });
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/snips/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
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
          {status === "saved" && (
            <span style={{ color: "green", fontSize: "0.875rem" }}>Saved</span>
          )}
          {status === "error" && (
            <span style={{ color: "red", fontSize: "0.875rem" }}>Error</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.375rem 0.875rem",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setStatus("idle");
        }}
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
