import { Link } from "react-router-dom";
import type { AutosaveState } from "./autosaveController.js";
import { Button } from "./components/ui/Button.js";
import { Pill } from "./components/ui/Pill.js";
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
		<Pill variant="status">
			<Icon
				name="clock"
				size={11}
				color={isSaving ? "var(--warn)" : "var(--ok)"}
			/>
			<span className="text-[11px] font-medium text-fg-3 whitespace-nowrap">
				{label}
			</span>
			{timeLabel && (
				<span className="text-[11px] text-fg-3 font-mono whitespace-nowrap">
					{timeLabel}
				</span>
			)}
		</Pill>
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
		<div className="flex items-center h-12 px-4 gap-3 bg-surface border-b border-border shrink-0 relative z-10">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<Link to="/" aria-label="Home" title="Home">
					<Button variant="icon" size="sm" className="no-underline">
						<Icon name="home" size={14} />
					</Button>
				</Link>

				<div className="w-px h-4 bg-border" />

				<Pill variant="accent">
					<Icon name="scissors" size={11} color="var(--accent)" />
					<span className="text-[11px] font-bold text-accent tracking-wide">
						snippaste
					</span>
				</Pill>

				<span className="text-[13px] text-fg-3">/</span>
				<span
					className="text-[13px] font-semibold text-fg font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-[240px]"
					title={slug}
				>
					{slug}
				</span>

				{isDirty && (
					<span
						className="w-1.5 h-1.5 rounded-full bg-warn shrink-0"
						title="Unsaved changes"
					/>
				)}
			</div>

			<StatusPill state={saveState} />

			<div className="flex items-center gap-2">
				<div className="flex items-center border border-border-2 rounded-[7px] overflow-hidden bg-surface-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopyUrl}
						title="Copy URL"
					>
						<Icon name="link" size={13} />
						Copy URL
					</Button>
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopyContent}
						title="Copy"
					>
						<Icon name="copy" size={13} />
						Copy
					</Button>
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button variant="ghost" size="sm" onClick={onSave} title="Save">
						<Icon name="save" size={13} />
						Save
					</Button>
				</div>

				<div className="flex items-center border border-border-2 rounded-[7px] overflow-hidden bg-surface-2">
					<Button
						variant="danger"
						size="sm"
						className="px-2"
						onClick={onClear}
						title="Clear"
						aria-label="Clear"
					>
						<Icon name="trash" size={13} />
					</Button>
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button
						variant="ghost"
						size="sm"
						className="px-2"
						onClick={onRefresh}
						title="Refresh"
						aria-label="Refresh"
					>
						<Icon name="refresh" size={13} />
					</Button>
				</div>

				<Button
					variant="icon"
					size="md"
					onClick={toggle}
					aria-label="Toggle theme"
					title={dark ? "Light mode" : "Dark mode"}
				>
					<Icon name={dark ? "sun" : "moon"} size={13} />
				</Button>
			</div>
		</div>
	);
}
