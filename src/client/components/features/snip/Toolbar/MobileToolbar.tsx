import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ToolbarMobileSheet } from "@/client/components/ToolbarMobileSheet";
import { Button } from "@/client/components/ui/Button";
import { Icon } from "@/client/Icon";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore";
import {
	useSnipSessionDirty,
	useSnipSessionStore,
} from "@/client/stores/snipSessionStore";
import { useTheme } from "@/client/stores/themeStore";
import { THEME } from "@/client/theme";
import type { ToolbarProps } from "./index";
import { ToolbarExpirationPill } from "./ToolbarExpirationPill";
import { ToolbarStatusPill } from "./ToolbarStatusPill";

export function MobileToolbar({
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
	mobileOverlayOpen,
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
	const settingsEnabled = autoSaveEnabled || passwordProtectionEnabled;
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
					<ToolbarStatusPill
						state={saveState}
						autoSaveEnabled={autoSaveEnabled}
						testId="mobile-save-status"
					/>
					{updatedAt !== undefined && (
						<ToolbarExpirationPill updatedAt={updatedAt} />
					)}
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
				disableDismiss={mobileOverlayOpen ?? false}
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
		</>
	);
}
