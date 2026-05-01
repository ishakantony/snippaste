import { type AutosaveState } from "./autosaveController.js";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function SaveStatus({ state }: { state: AutosaveState }) {
  if (state.status === "saving") {
    return (
      <span className="toolbar-status">
        <span className="toolbar-dot toolbar-dot--saving" />
        saving
      </span>
    );
  }
  if (state.status === "saved") {
    return (
      <span className="toolbar-status">
        <span className="toolbar-dot toolbar-dot--saved" />
        saved {formatTimestamp(state.timestamp)}
      </span>
    );
  }
  if (state.status === "offline") {
    return (
      <span className="toolbar-status">
        <span className="toolbar-dot toolbar-dot--warn" />
        offline
      </span>
    );
  }
  if (state.status === "too_large") {
    return (
      <span className="toolbar-status">
        <span className="toolbar-dot toolbar-dot--error" />
        too large
      </span>
    );
  }
  return null;
}

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
    <div className="toolbar">
      <div className="toolbar-id">
        <span className="toolbar-brand">snippaste</span>
        <span className="toolbar-slash">/</span>
        <span className="toolbar-slug">{slug}</span>
      </div>

      <div className="toolbar-center">
        <SaveStatus state={saveState} />
      </div>

      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={handleCopyUrl} title="Copy URL">
          copy url
        </button>
        <span className="toolbar-divider">·</span>
        <button className="toolbar-btn" onClick={handleCopyContent} title="Copy content">
          copy
        </button>
        <span className="toolbar-divider">·</span>
        <button className="toolbar-btn" onClick={handleDownload} title="Download">
          ↓ save
        </button>
        <span className="toolbar-divider">·</span>
        <button className="toolbar-btn toolbar-btn--danger" onClick={handleClear} title="Clear snip">
          clear
        </button>
      </div>
    </div>
  );
}
