import { Link } from "react-router-dom";
import type { AutosaveState } from "./autosaveController.js";
import { Icon } from "./Icon.js";
import { useTheme } from "./themeContext.js";

function relativeTime(ts: number): string {
	const diff = Math.floor((Date.now() - ts) / 1000);
	if (diff < 5) return "just now";
	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	return `${Math.floor(diff / 3600)}h ago`;
}

function StatusPill({ state }: { state: AutosaveState }) {
	const isSaving = state.status === "saving" || state.status === "dirty";

	let label: string;
	let timeLabel: string | null = null;
	if (state.status === "saving" || state.status === "dirty") {
		label = "saving…";
	} else if (state.status === "saved") {
		label = "auto-saved";
		timeLabel = relativeTime(state.timestamp);
	} else if (state.status === "offline") {
		label = "offline";
	} else if (state.status === "too_large") {
		label = "too large";
	} else {
		label = "ready";
	}

	return (
		<div className="toolbar-status-pill">
			<Icon
				name="clock"
				size={11}
				color={isSaving ? "var(--warn)" : "var(--ok)"}
			/>
			<span className="toolbar-status-text">{label}</span>
			{timeLabel && <span className="toolbar-status-time">{timeLabel}</span>}
		</div>
	);
}

export interface ToolbarProps {
	slug: string;
	saveState: AutosaveState;
	isDirty: boolean;
	onCopyUrl: () => void;
	onCopyContent: () => void;
	onSave: () => void;
	onClear: () => void;
	onRefresh: () => void;
}

export function Toolbar({
	slug,
	saveState,
	isDirty,
	onCopyUrl,
	onCopyContent,
	onSave,
	onClear,
	onRefresh,
}: ToolbarProps) {
	const { theme, toggle } = useTheme();
	const dark = theme === "dark";

	return (
		<div className="toolbar">
			<div className="toolbar-left">
				<Link to="/" className="toolbar-home" aria-label="Home" title="Home">
					<Icon name="home" size={14} />
				</Link>

				<div className="toolbar-hairline" />

				<div className="toolbar-pill">
					<Icon name="scissors" size={11} color="var(--accent)" />
					<span className="toolbar-pill-text">snippaste</span>
				</div>

				<span className="toolbar-slash">/</span>
				<span className="toolbar-slug" title={slug}>
					{slug}
				</span>

				{isDirty && (
					<span className="toolbar-dirty-dot" title="Unsaved changes" />
				)}
			</div>

			<StatusPill state={saveState} />

			<div className="toolbar-right">
				<div className="tool-group">
					<button
						type="button"
						className="tool-btn"
						onClick={onCopyUrl}
						title="Copy URL"
					>
						<Icon name="link" size={13} />
						Copy URL
					</button>
					<div className="tool-group-sep" />
					<button
						type="button"
						className="tool-btn"
						onClick={onCopyContent}
						title="Copy"
					>
						<Icon name="copy" size={13} />
						Copy
					</button>
					<div className="tool-group-sep" />
					<button
						type="button"
						className="tool-btn"
						onClick={onSave}
						title="Save"
					>
						<Icon name="save" size={13} />
						Save
					</button>
				</div>

				<div className="tool-group">
					<button
						type="button"
						className="tool-btn tool-btn--icon tool-btn--danger"
						onClick={onClear}
						title="Clear"
						aria-label="Clear"
					>
						<Icon name="trash" size={13} />
					</button>
					<div className="tool-group-sep" />
					<button
						type="button"
						className="tool-btn tool-btn--icon"
						onClick={onRefresh}
						title="Refresh"
						aria-label="Refresh"
					>
						<Icon name="refresh" size={13} />
					</button>
				</div>

				<button
					type="button"
					className="theme-toggle theme-toggle--icon-only"
					onClick={toggle}
					aria-label="Toggle theme"
					title={dark ? "Light mode" : "Dark mode"}
				>
					<Icon name={dark ? "sun" : "moon"} size={13} />
				</button>
			</div>
		</div>
	);
}
