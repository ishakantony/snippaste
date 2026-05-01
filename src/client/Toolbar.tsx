import { Link } from "react-router-dom";
import { type AutosaveState } from "./autosaveController.js";
import { useTheme } from "./themeContext.js";
import { Icon } from "./Icon.js";

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
        <Icon name="clock" size={11} />
        saving...
      </span>
    );
  }
  if (state.status === "saved") {
    return (
      <span className="toolbar-status">
        <Icon name="clock" size={11} />
        <span>auto-saved</span>
        <span className="toolbar-status-time">{formatTimestamp(state.timestamp)}</span>
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
  remoteChanged: boolean;
  onGetContent: () => string;
  onClear: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onToast: (message: string) => void;
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="tool-group">{children}</div>;
}

function ToolBtn({ icon, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ComponentProps<typeof Icon>["name"] }) {
  return <button {...props} className={`toolbar-btn ${props.className ?? ""}`}>{icon && <Icon name={icon} size={13} />}{children}</button>;
}

export function Toolbar({ slug, saveState, remoteChanged, onGetContent, onClear, onRefresh, onSave, onToast }: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDirty = saveState.status === "dirty" || saveState.status === "saving";

  function handleCopyUrl() {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url).then(() => onToast("Copied URL"), () => {});
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(onGetContent()).then(() => onToast("Copied"), () => {});
  }

  return (
    <div className="toolbar">
      <div className="toolbar-id">
        <Link to="/" className="home-link" title="Home"><Icon name="home" size={14} /></Link>
        <span className="toolbar-hairline" />
        <span className="toolbar-brand"><span className="brand-mark"><Icon name="scissors" size={11} /></span> snippaste</span>
        <span className="toolbar-slash">/</span>
        <span className="toolbar-slug">{slug}</span>
        {isDirty && <span className="dirty-dot" title="Unsaved changes" />}
      </div>

      <div className="toolbar-center">
        {remoteChanged ? <span className="remote-hint">remote update available — refresh</span> : <SaveStatus state={saveState} />}
      </div>

      <div className="toolbar-actions">
        <ToolGroup>
          <ToolBtn icon="link" onClick={handleCopyUrl} title="Copy URL">Copy URL</ToolBtn>
          <ToolBtn icon="copy" onClick={handleCopyContent} title="Copy content">Copy</ToolBtn>
          <ToolBtn icon="save" onClick={onSave} title="Save now">Save</ToolBtn>
        </ToolGroup>
        <span className="toolbar-slash">/</span>
        <ToolGroup>
          <ToolBtn icon="trash" className="toolbar-btn--danger" onClick={onClear} title="Clear snip">Clear</ToolBtn>
          <ToolBtn icon="refresh" onClick={onRefresh} title="Refresh from server">Refresh</ToolBtn>
        </ToolGroup>
        <ToolBtn className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}><Icon name={theme === "dark" ? "sun" : "moon"} size={13} /></ToolBtn>
      </div>
    </div>
  );
}
