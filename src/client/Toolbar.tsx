import { type AutosaveState } from "./autosaveController.js";

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

const btnStyle: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  fontSize: "0.8rem",
  cursor: "pointer",
  background: "transparent",
  border: "1px solid #ccc",
  borderRadius: "4px",
  color: "#333",
  whiteSpace: "nowrap",
};

export interface ToolbarProps {
  slug: string;
  saveState: AutosaveState;
  onGetContent: () => string;
  onClear: () => void;
}

export function Toolbar({ slug, saveState, onGetContent, onClear }: ToolbarProps) {
  function handleCopyUrl() {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(onGetContent()).catch(() => {});
  }

  function handleDownload() {
    const content = onGetContent();
    const blob = new Blob([content], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${slug}.txt`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  function handleClear() {
    const confirmed = window.confirm(
      "Clear this snip? Everyone with the URL will see it as empty."
    );
    if (confirmed) {
      onClear();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "36px",
        padding: "0 0.75rem",
        borderBottom: "1px solid #ddd",
        background: "#fafafa",
        flexShrink: 0,
        gap: "0.5rem",
      }}
    >
      {/* Left: snip name */}
      <div style={{ flex: "0 0 auto", fontSize: "0.875rem", color: "#333", minWidth: 0 }}>
        {slug}
      </div>

      {/* Center: save indicator */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SaveIndicator state={saveState} />
      </div>

      {/* Right: action buttons */}
      <div style={{ flex: "0 0 auto", display: "flex", gap: "0.35rem", alignItems: "center" }}>
        <button style={btnStyle} onClick={handleCopyUrl} title="Copy URL">
          Copy URL
        </button>
        <button style={btnStyle} onClick={handleCopyContent} title="Copy content">
          Copy
        </button>
        <button style={btnStyle} onClick={handleDownload} title="Download">
          ⬇ Download
        </button>
        <button
          style={{ ...btnStyle, color: "#c0392b", borderColor: "#e0b0b0" }}
          onClick={handleClear}
          title="Clear snip"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
