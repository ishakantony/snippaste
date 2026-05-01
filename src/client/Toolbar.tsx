import { Link } from "react-router-dom";
import { type AutosaveState } from "./autosaveController.js";

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function SaveStatus({ state }: { state: AutosaveState }) {
  if (state.status === "saving") {
    return (
      <>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="toolbar-status-text">saving…</span>
      </>
    );
  }
  if (state.status === "saved") {
    return (
      <>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="toolbar-status-text">auto-saved</span>
        <span className="toolbar-status-time">{relativeTime(state.timestamp)}</span>
      </>
    );
  }
  if (state.status === "offline") {
    return (
      <>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="toolbar-status-text">offline</span>
      </>
    );
  }
  if (state.status === "too_large") {
    return (
      <>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="toolbar-status-text">too large</span>
      </>
    );
  }
  return (
    <>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7A96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="toolbar-status-text">auto-saved</span>
    </>
  );
}

export interface ToolbarProps {
  slug: string;
  saveState: AutosaveState;
  onGetContent: () => string;
  onClear: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onCopyUrl: () => void;
  onCopyContent: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export function Toolbar({
  slug,
  saveState,
  onGetContent,
  onClear,
  onSave,
  onRefresh,
  onCopyUrl,
  onCopyContent,
  theme,
  onThemeToggle,
}: ToolbarProps) {
  const isDirty = saveState.status === "dirty" || saveState.status === "saving";

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Link to="/" className="toolbar-home" title="Home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>

        <div className="toolbar-hairline" />

        <div className="toolbar-pill">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6470F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          <span className="toolbar-pill-text">snippaste</span>
        </div>

        <span className="toolbar-slash">/</span>

        <span className="toolbar-slug" title={slug}>
          {slug}
        </span>

        {isDirty && <div className="toolbar-dirty-dot" title="Unsaved changes" />}
      </div>

      <div className="toolbar-center">
        <SaveStatus state={saveState} />
      </div>

      <div className="toolbar-right">
        <div className="tool-group">
          <button className="tool-btn" onClick={onCopyUrl} title="Copy URL">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Copy URL</span>
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={onCopyContent} title="Copy content">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy</span>
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={onSave} title="Save">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Save</span>
          </button>
        </div>

        <div className="tool-group">
          <button className="tool-btn tool-btn--danger" onClick={onClear} title="Clear snip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear</span>
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={onRefresh} title="Refresh from server">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <button
          className="tool-btn tool-btn--icon-only"
          onClick={onThemeToggle}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          style={{
            border: "1px solid var(--border-2)",
            borderRadius: 7,
            background: "var(--surface-2)",
          }}
        >
          {theme === "dark" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
