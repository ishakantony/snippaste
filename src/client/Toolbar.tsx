import { type AutosaveState } from "./autosaveController.js";
import { useTheme } from "./themeContext.js";
import { Link } from "react-router-dom";
import { showToast } from "./Toast.js";

const PATHS: Record<string, string> = {
  home:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  scissors:'M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock:   'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  link:    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  copy:    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  save:    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  trash:   'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  sun:     'M12 3v1m0 16v1M4.22 4.22l.71.71m12.02 12.02.71.71M1 12h1m18 0h1M4.22 19.78l.71-.71M18.95 5.05l-.71.71M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
  moon:    'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  check:   'M20 6L9 17l-5-5',
};

function Ico({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] || ""} />
    </svg>
  );
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export interface ToolbarProps {
  slug: string;
  saveState: AutosaveState;
  dirty: boolean;
  onGetContent: () => string;
  onClear: () => void;
  onRefresh: () => void;
  onSave: () => void;
}

export function Toolbar({ slug, saveState, dirty, onGetContent, onClear, onRefresh, onSave }: ToolbarProps) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  function handleCopyUrl() {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast("URL copied");
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(onGetContent()).catch(() => {});
    showToast("Content copied to clipboard");
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Link to="/" className="toolbar-home" title="Home">
          <Ico name="home" size={14} />
        </Link>
        <div className="toolbar-hairline" />
        <span className="toolbar-pill">
          <Ico name="scissors" size={11} />
          <span>snippaste</span>
        </span>
        <span className="toolbar-slash">/</span>
        <span className="toolbar-slug">{slug}</span>
        {dirty && <span className="toolbar-dirty-dot" />}
      </div>

      <div className="toolbar-center">
        <Ico name="clock" size={11} />
        {dirty ? (
          <span className="center-text">saving…</span>
        ) : saveState.status === "saved" ? (
          <>
            <span className="center-text">auto-saved</span>
            <span className="center-time">{formatRelative(saveState.timestamp)}</span>
          </>
        ) : saveState.status === "offline" ? (
          <span className="center-text">offline</span>
        ) : saveState.status === "too_large" ? (
          <span className="center-text">too large</span>
        ) : (
          <span className="center-text">auto-saved</span>
        )}
      </div>

      <div className="toolbar-right">
        <div className="tool-group">
          <button className="tool-btn" onClick={handleCopyUrl} title="Copy URL">
            <Ico name="link" size={13} /> Copy URL
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={handleCopyContent} title="Copy content">
            <Ico name="copy" size={13} /> Copy
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={onSave} title="Save">
            <Ico name="save" size={13} /> Save
          </button>
        </div>
        <div className="tool-group">
          <button className="tool-btn tool-btn--danger" onClick={onClear} title="Clear">
            <Ico name="trash" size={13} /> Clear
          </button>
          <div className="tool-sep" />
          <button className="tool-btn" onClick={onRefresh} title="Refresh">
            <Ico name="refresh" size={13} /> Refresh
          </button>
        </div>
        <button className="toolbar-theme-toggle" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
          <Ico name={dark ? "sun" : "moon"} size={13} />
        </button>
      </div>
    </div>
  );
}
