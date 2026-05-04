import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
	AUTOSAVE_STATUS,
	type AutosaveState,
} from "@/client/autosaveController.js";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher.js";
import { ToolbarMobileSheet } from "@/client/components/ToolbarMobileSheet.js";
import { Button } from "@/client/components/ui/Button.js";
import { Pill } from "@/client/components/ui/Pill.js";
import { Icon } from "@/client/Icon.js";
import { getExpirationInfo } from "@/client/lib/expirationCountdown.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";
import {
	useSnipSessionDirty,
	useSnipSessionStore,
} from "@/client/stores/snipSessionStore.js";
import { useTheme } from "@/client/stores/themeStore.js";
import { THEME } from "@/client/theme.js";

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

function StatusPill({
	state,
	autoSaveEnabled,
	testId = "save-status",
}: {
	state: AutosaveState;
	autoSaveEnabled: boolean;
	testId?: string;
}) {
	const { t } = useTranslation();
	const isSaving =
		state.status === AUTOSAVE_STATUS.SAVING ||
		state.status === AUTOSAVE_STATUS.DIRTY;

	let label: string;
	let timeLabel: string | null = null;
	switch (state.status) {
		case AUTOSAVE_STATUS.SAVING:
		case AUTOSAVE_STATUS.DIRTY: {
			label = autoSaveEnabled ? t("status.saving") : t("status.unsaved");
			break;
		}
		case AUTOSAVE_STATUS.SAVED: {
			label = autoSaveEnabled ? t("status.autoSaved") : t("status.saved");
			timeLabel = relativeTime(state.timestamp, t);
			break;
		}
		case AUTOSAVE_STATUS.OFFLINE: {
			label = t("status.offline");
			break;
		}
		case AUTOSAVE_STATUS.TOO_LARGE: {
			label = t("status.tooLarge");
			break;
		}
		case AUTOSAVE_STATUS.LOCKED: {
			label = t("status.locked");
			break;
		}
		default: {
			label = t("status.ready");
			break;
		}
	}

	return (
		<Pill variant="default" data-testid={testId}>
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

function ExpirationPill({ updatedAt }: { updatedAt: number }) {
	const { t } = useTranslation();
	const [info, setInfo] = useState(() =>
		getExpirationInfo(updatedAt, Date.now()),
	);

	useEffect(() => {
		setInfo(getExpirationInfo(updatedAt, Date.now()));
		const id = setInterval(() => {
			setInfo(getExpirationInfo(updatedAt, Date.now()));
		}, 60_000);
		return () => clearInterval(id);
	}, [updatedAt]);

	const colorMap = {
		green: "var(--ok)",
		yellow: "var(--warn)",
		red: "var(--danger)",
	};

	const text = info.isExpired
		? t("status.expired")
		: t("status.daysLeft", { count: info.daysRemaining });

	return (
		<Pill variant="default">
			<Icon name="calendar" size={11} color={colorMap[info.color]} />
			<span
				className="text-xs font-medium whitespace-nowrap"
				style={{ color: colorMap[info.color] }}
			>
				{text}
			</span>
		</Pill>
	);
}

export interface ToolbarProps {
	slug: string;
	content: string;
	onCopyUrl: () => void;
	onCopyContent: () => void;
	onSave: () => void;
	onClear: () => void;
	onRefresh: () => void;
	onQr: () => void;
	onSettings: () => void;
	autoSaveEnabled: boolean;
	autoSaveFeatureEnabled: boolean;
	mobileOverlayOpen?: boolean;
}

export function Toolbar({
	slug,
	content,
	onCopyUrl,
	onCopyContent,
	onSave,
	onClear,
	onRefresh,
	onQr,
	onSettings,
	autoSaveEnabled,
	autoSaveFeatureEnabled,
	mobileOverlayOpen = false,
}: ToolbarProps) {
	const { theme, toggle } = useTheme();
	const { t } = useTranslation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
	const wasLockedRef = useRef(false);
	const saveState = useSnipSessionStore((state) => state.saveState);
	const updatedAt = useSnipSessionStore((state) => state.updatedAt);
	const isLocked = useSnipSessionStore((state) => state.isLocked);
	const isDirty = useSnipSessionDirty();
	const dark = theme === THEME.DARK;
	const qrEnabled = useFeatureFlag("qrCode");
	const langEnabled = useFeatureFlag("languageSwitcher");
	const passwordProtectionEnabled = useFeatureFlag("passwordProtection");
	const settingsEnabled = autoSaveFeatureEnabled || passwordProtectionEnabled;
	const lines = content.length === 0 ? 1 : content.split("\n").length;
	const chars = content.length;

	function openMobileMenu() {
		setMobileMenuClosing(false);
		setMobileMenuOpen(true);
	}

	const closeMobileMenu = useCallback(() => {
		setMobileMenuClosing(true);
		window.setTimeout(() => {
			setMobileMenuOpen(false);
			setMobileMenuClosing(false);
		}, 180);
	}, []);

	useEffect(() => {
		const becameLocked = !wasLockedRef.current && isLocked;
		wasLockedRef.current = isLocked;
		if (!becameLocked || !mobileMenuOpen) return;
		setMobileMenuOpen(false);
		setMobileMenuClosing(false);
	}, [isLocked, mobileMenuOpen]);

	return (
		<>
			<div className="relative z-10 flex shrink-0 flex-col border-b border-border bg-surface md:hidden">
				<div className="flex h-12 items-center gap-2 px-3 pt-[env(safe-area-inset-top)]">
					<Link to="/" aria-label={t("toolbar.home")} title={t("toolbar.home")}>
						<Button variant="icon" size="md" className="no-underline">
							<img src="/logo.svg" alt="" className="h-4 w-4 rounded-3" />
						</Button>
					</Link>

					<div className="min-w-0 flex-1">
						<div
							className="flex min-w-0 items-center gap-1.5"
							data-testid="mobile-snip-title"
						>
							<span className="text-xs font-bold tracking-[0.06em] text-fg-3 uppercase">
								snippaste
							</span>
							<span className="text-xs text-fg-3">/</span>
							<span className="min-w-0 truncate font-mono text-sm font-semibold text-fg">
								{slug}
							</span>
							{isDirty && (
								<span
									className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
									title={t("toolbar.unsavedChanges")}
								/>
							)}
						</div>
					</div>

					<Button
						variant="icon"
						size="md"
						onClick={openMobileMenu}
						aria-label="More actions"
						title="More actions"
					>
						<span className="text-lg leading-none">⋯</span>
					</Button>
				</div>

				<div className="flex items-center gap-2 overflow-x-auto px-3 pb-2">
					<StatusPill
						state={saveState}
						autoSaveEnabled={autoSaveEnabled}
						testId="mobile-save-status"
					/>
					{updatedAt !== undefined && <ExpirationPill updatedAt={updatedAt} />}
					<span className="shrink-0 font-mono text-2xs text-fg-3">
						{t("status.lines", { count: lines })}
					</span>
					<span className="shrink-0 font-mono text-2xs text-fg-3">
						{t("status.chars", { count: chars })}
					</span>
				</div>
			</div>

			{!isLocked && (
				<div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur md:hidden">
					<div
						className="grid grid-cols-3 gap-2"
						data-testid="mobile-action-bar"
					>
						<Button
							variant="default"
							size="lg"
							className="h-11 min-w-0 rounded-lg border-border-2 bg-surface-2 px-2"
							onClick={onCopyUrl}
							title={t("toolbar.copyUrl")}
						>
							<Icon name="link" size={14} />
							<span className="min-w-0 truncate">{t("toolbar.copyUrl")}</span>
						</Button>
						<Button
							variant="default"
							size="lg"
							className="h-11 min-w-0 rounded-lg border-border-2 bg-surface-2 px-2"
							onClick={onCopyContent}
							title={t("toolbar.copy")}
						>
							<Icon name="copy" size={14} />
							<span className="min-w-0 truncate">{t("toolbar.copy")}</span>
						</Button>
						<Button
							variant="primary"
							size="lg"
							className="h-11 min-w-0 rounded-lg px-2"
							onClick={onSave}
							title={t("toolbar.save")}
						>
							<Icon name="save" size={14} />
							<span className="min-w-0 truncate">{t("toolbar.save")}</span>
						</Button>
					</div>
				</div>
			)}

			<ToolbarMobileSheet
				open={mobileMenuOpen}
				closing={mobileMenuClosing}
				onClose={closeMobileMenu}
				disableDismiss={mobileOverlayOpen}
				isLocked={isLocked}
				qrEnabled={qrEnabled}
				languageSwitcherEnabled={langEnabled}
				dark={dark}
				settingsEnabled={settingsEnabled}
				onQr={onQr}
				onRefresh={onRefresh}
				onToggleTheme={toggle}
				onSettings={onSettings}
				onClear={onClear}
			/>

			<div className="relative z-10 hidden h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:flex">
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

					<StatusPill state={saveState} autoSaveEnabled={autoSaveEnabled} />
				</div>

				{updatedAt !== undefined && (
					<div className="absolute left-1/2 -translate-x-1/2">
						<ExpirationPill updatedAt={updatedAt} />
					</div>
				)}

				<div className="flex items-center gap-2">
					{!isLocked && (
						<>
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
						</>
					)}

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
						{!isLocked && settingsEnabled && (
							<>
								<Button
									variant="ghost"
									size="sm"
									className="rounded-none border-none px-2"
									onClick={onSettings}
									aria-label={t("toolbar.settings")}
									title={t("toolbar.settings")}
								>
									<Icon name="settings" size={13} />
								</Button>
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
		</>
	);
}
