import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { type AutosaveState } from "./autosaveController.js";
import { useTheme } from "./themeContext.js";

function HomeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ScissorsIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l6 6m0 0l6-6M12 9v13M5.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    </svg>
  );
}

function ClockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LinkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SaveIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function TrashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function RefreshIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SunIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17l-5-5" />
    </svg>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function SaveStatus({ state }: { state: AutosaveState }) {
  const isDirty = state.status === "dirty" || state.status === "saving";
  const iconColor = isDirty ? "var(--warn)" : "var(--ok)";

  return (
    <span className="toolbar-status-pill">
      <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>
        <ClockIcon />
      </span>
    {isDirty && <span>saving…</span>}
    {!isDirty && state.status === "saved" && (
      <>
        <span>auto-saved</span>
        <span className="toolbar-status-time">{formatRelativeTime(state.timestamp)}</span>
      </>
    )}
    {!isDirty && state.status === "offline" && <span>offline</span>}
    {!isDirty && state.status === "too_large" && <span>too large</span>}
    {!isDirty && state.status === "idle" && <span>auto-saved</span>}
    </span>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function ToolButton({ icon, label, onClick, danger }: ToolButtonProps) {
  const [flash, setFlash] = useState(false);

  const handleClick = useCallback(() => {
    if (!danger) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
    onClick();
  }, [danger, onClick]);

  return (
    <button
      className={`tool-btn ${danger ? "tool-btn--danger" : ""} ${flash ? "tool-btn--flash" : ""}`}
      onClick={handleClick}
      title={label}
    >
      {flash ? <CheckIcon size={13} /> : icon}
      {label}
    </button>
  );
}

export interface ToolbarProps {
  slug: string;
  saveState: AutosaveState;
  isDirty: boolean;
  onClear: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onCopyUrl: () => void;
  onCopyContent: () => void;
  remoteChanged: boolean;
  onApplyRemote: () => void;
}

export function Toolbar({
  slug,
  saveState,
  isDirty,
  onClear,
  onRefresh,
  onSave,
  onCopyUrl,
  onCopyContent,
  remoteChanged,
  onApplyRemote,
}: ToolbarProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <Link to="/" className="toolbar-home" title="Home">
          <HomeIcon size={14} />
        </Link>
        <div className="toolbar-divider-v" />
        <div className="toolbar-brand-pill">
          <ScissorsIcon size={11} />
          <span className="toolbar-brand-text">snippaste</span>
        </div>
        <span className="toolbar-slash">/</span>
        <span className="toolbar-slug">{slug}</span>
        {isDirty && <span className="toolbar-dirty-dot" title="Unsaved changes" />}
        {remoteChanged && (
          <span className="remote-hint" onClick={onApplyRemote}>
            remote update available — refresh
          </span>
        )}
      </div>

      <div className="toolbar-center">
        <SaveStatus state={saveState} />
      </div>

      <div className="toolbar-right">
        <div className="tool-group">
          <ToolButton icon={<LinkIcon size={13} />} label="Copy URL" onClick={onCopyUrl} />
          <div className="tool-sep" />
          <ToolButton icon={<CopyIcon size={13} />} label="Copy" onClick={onCopyContent} />
          <div className="tool-sep" />
          <ToolButton icon={<SaveIcon size={13} />} label="Save" onClick={onSave} />
        </div>

        <div className="tool-group">
          <ToolButton icon={<TrashIcon size={13} />} label="Clear" onClick={onClear} danger />
          <div className="tool-sep" />
          <ToolButton icon={<RefreshIcon size={13} />} label="Refresh" onClick={onRefresh} />
        </div>

        <button className="toolbar-theme-btn" onClick={toggle} title="Toggle theme">
          {theme === "dark" ? <SunIcon size={13} /> : <MoonIcon size={13} />}
        </button>
      </div>
    </div>
  );
}
