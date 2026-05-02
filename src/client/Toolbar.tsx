import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { AutosaveState } from "@/client/autosaveController.js";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher.js";
import { Button } from "@/client/components/ui/Button.js";
import { Pill } from "@/client/components/ui/Pill.js";
import { useFeatureFlag } from "@/client/featureFlagsContext.js";
import { Icon } from "@/client/Icon.js";
import { useTheme } from "@/client/themeContext.js";

function relativeTime(
	ts: number,
	t: (key: string, opts?: Record<string, unknown>) => string,
): string {
	const diff = Math.floor((Date.now() - ts) / 1000);
	if (diff < 5) return t("status.justNow");
	if (diff < 60) return t("status.secondsAgo", { count: diff });
	if (diff < 3600)
		return t("status.minutesAgo", { count: Math.floor(diff / 60) });
	return t("status.hoursAgo", { count: Math.floor(diff / 3600) });
}

function StatusPill({ state }: { state: AutosaveState }) {
	const { t } = useTranslation();
	const isSaving = state.status === "saving" || state.status === "dirty";

	let label: string;
	let timeLabel: string | null = null;
	if (state.status === "saving" || state.status === "dirty") {
		label = t("status.saving");
	} else if (state.status === "saved") {
		label = t("status.autoSaved");
		timeLabel = relativeTime(state.timestamp, t);
	} else if (state.status === "offline") {
		label = t("status.offline");
	} else if (state.status === "too_large") {
		label = t("status.tooLarge");
	} else {
		label = t("status.ready");
	}

	return (
		<Pill variant="status">
			<Icon
				name="clock"
				size={11}
				color={isSaving ? "var(--warn)" : "var(--ok)"}
			/>
			<span className="text-xs font-medium text-fg-3 whitespace-nowrap">
				{label}
			</span>
			{timeLabel && (
				<span className="text-xs text-fg-3 font-mono whitespace-nowrap">
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
	onQr: () => void;
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
	onQr,
}: ToolbarProps) {
	const { theme, toggle } = useTheme();
	const { t } = useTranslation();
	const dark = theme === "dark";
	const qrEnabled = useFeatureFlag("qrCode");
	const langEnabled = useFeatureFlag("languageSwitcher");

	return (
		<div className="flex items-center h-12 px-4 gap-3 bg-surface border-b border-border shrink-0 relative z-10">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<Link to="/" aria-label={t("toolbar.home")} title={t("toolbar.home")}>
					<Button variant="icon" size="sm" className="no-underline">
						<img src="/logo.svg" alt="" className="w-4 h-4 rounded-3" />
					</Button>
				</Link>

				<div className="w-px h-4 bg-border" />

				<Pill variant="accent">
					<Icon name="scissors" size={11} color="var(--accent)" />
					<span className="text-xs font-bold text-accent tracking-wide">
						snippaste
					</span>
				</Pill>

				<span className="text-sm text-fg-3">/</span>
				<span
					className="text-sm font-semibold text-fg font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-60"
					title={slug}
				>
					{slug}
				</span>

				{isDirty && (
					<span
						className="w-1.5 h-1.5 rounded-full bg-warn shrink-0"
						title={t("toolbar.unsavedChanges")}
					/>
				)}
			</div>

			<StatusPill state={saveState} />

			<div className="flex items-center gap-2">
				<div className="flex items-center border border-border-2 rounded-7 overflow-hidden bg-surface-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopyUrl}
						title={t("toolbar.copyUrl")}
					>
						<Icon name="link" size={13} />
						{t("toolbar.copyUrl")}
					</Button>
					{qrEnabled && (
						<>
							<div className="w-px h-5 bg-border-2 shrink-0" />
							<Button
								variant="ghost"
								size="sm"
								onClick={onQr}
								title={t("toolbar.qrCode")}
							>
								<Icon name="qr" size={13} />
								{t("toolbar.qr")}
							</Button>
						</>
					)}
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopyContent}
						title={t("toolbar.copy")}
					>
						<Icon name="copy" size={13} />
						{t("toolbar.copy")}
					</Button>
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button
						variant="ghost"
						size="sm"
						onClick={onSave}
						title={t("toolbar.save")}
					>
						<Icon name="save" size={13} />
						{t("toolbar.save")}
					</Button>
				</div>

				<div className="flex items-center border border-border-2 rounded-7 overflow-hidden bg-surface-2">
					<Button
						variant="danger"
						size="sm"
						className="px-2"
						onClick={onClear}
						title={t("toolbar.clear")}
						aria-label={t("toolbar.clear")}
					>
						<Icon name="trash" size={13} />
					</Button>
					<div className="w-px h-5 bg-border-2 shrink-0" />
					<Button
						variant="ghost"
						size="sm"
						className="px-2"
						onClick={onRefresh}
						title={t("toolbar.refresh")}
						aria-label={t("toolbar.refresh")}
					>
						<Icon name="refresh" size={13} />
					</Button>
				</div>

				<div className="flex items-center border border-border-2 rounded-7 bg-surface-2">
					{langEnabled && (
						<>
							<LanguageSwitcher
								variant="ghost"
								size="sm"
								className="rounded-none border-none px-2"
							/>
							<div className="w-px h-5 bg-border-2 shrink-0" />
						</>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="rounded-none border-none px-2"
						onClick={toggle}
						aria-label={t("common.toggleTheme")}
						title={dark ? t("common.lightMode") : t("common.darkMode")}
					>
						<Icon name={dark ? "sun" : "moon"} size={13} />
					</Button>
				</div>
			</div>
		</div>
	);
}
