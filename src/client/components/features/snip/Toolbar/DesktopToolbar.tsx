import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher.js";
import { Button } from "@/client/components/ui/Button.js";
import { Pill } from "@/client/components/ui/Pill.js";
import { Icon } from "@/client/Icon.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";
import {
	useSnipSessionDirty,
	useSnipSessionStore,
} from "@/client/stores/snipSessionStore.js";
import { useTheme } from "@/client/stores/themeStore.js";
import { THEME } from "@/client/theme.js";
import type { ToolbarProps } from "./index.js";
import { ToolbarExpirationPill } from "./ToolbarExpirationPill.js";
import { ToolbarStatusPill } from "./ToolbarStatusPill.js";

export function DesktopToolbar({
	slug,
	onCopyUrl,
	onCopyContent,
	onSave,
	onClear,
	onRefresh,
	onQr,
	onSettings,
	autoSaveEnabled,
}: ToolbarProps) {
	const { theme, toggle } = useTheme();
	const { t } = useTranslation();
	const saveState = useSnipSessionStore((state) => state.saveState);
	const updatedAt = useSnipSessionStore((state) => state.updatedAt);
	const isLocked = useSnipSessionStore((state) => state.isLocked);
	const isDirty = useSnipSessionDirty();
	const dark = theme === THEME.DARK;
	const qrEnabled = useFeatureFlag("qrCode");
	const langEnabled = useFeatureFlag("languageSwitcher");
	const passwordProtectionEnabled = useFeatureFlag("passwordProtection");
	const settingsEnabled = autoSaveEnabled || passwordProtectionEnabled;

	return (
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

				<ToolbarStatusPill
					state={saveState}
					autoSaveEnabled={autoSaveEnabled}
				/>
			</div>

			{updatedAt !== undefined && (
				<div className="absolute left-1/2 -translate-x-1/2">
					<ToolbarExpirationPill updatedAt={updatedAt} />
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
	);
}
