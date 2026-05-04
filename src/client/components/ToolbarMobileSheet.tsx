import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher";
import {
	BottomSheet,
	BottomSheetAction,
} from "@/client/components/ui/BottomSheet";

export interface ToolbarMobileSheetProps {
	open: boolean;
	closing: boolean;
	onClose: () => void;
	disableDismiss: boolean;
	isLocked: boolean;
	qrEnabled: boolean;
	languageSwitcherEnabled: boolean;
	dark: boolean;
	settingsEnabled: boolean;
	onQr: () => void;
	onRefresh: () => void;
	onToggleTheme: () => void;
	onSettings: () => void;
	onClear: () => void;
}

export function ToolbarMobileSheet({
	open,
	closing,
	onClose,
	disableDismiss,
	isLocked,
	qrEnabled,
	languageSwitcherEnabled,
	dark,
	settingsEnabled,
	onQr,
	onRefresh,
	onToggleTheme,
	onSettings,
	onClear,
}: ToolbarMobileSheetProps) {
	const { t } = useTranslation();

	return (
		<BottomSheet
			open={open}
			closing={closing}
			title="More actions"
			onClose={onClose}
			closeLabel="Close more actions"
			dismissLabel="Dismiss more actions"
			disableDismiss={disableDismiss}
			testId="mobile-overflow-sheet"
		>
			<div className="grid grid-cols-2 gap-2">
				{qrEnabled && !isLocked && (
					<BottomSheetAction label={t("toolbar.qr")} icon="qr" onClick={onQr} />
				)}
				{!isLocked && (
					<BottomSheetAction
						label={t("toolbar.refresh")}
						icon="refresh"
						onClick={onRefresh}
					/>
				)}
				{languageSwitcherEnabled && (
					<LanguageSwitcher
						variant="ghost"
						size="lg"
						iconSize={15}
						className="h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm"
						menuClassName="top-auto bottom-full mt-0 mb-1"
					/>
				)}
				<BottomSheetAction
					label={dark ? t("common.lightMode") : t("common.darkMode")}
					icon={dark ? "sun" : "moon"}
					onClick={onToggleTheme}
				/>
				{settingsEnabled && !isLocked && (
					<BottomSheetAction
						label={t("toolbar.settings")}
						icon="settings"
						onClick={onSettings}
					/>
				)}
			</div>
			{!isLocked && (
				<div className="mt-3 border-t border-border pt-3">
					<BottomSheetAction
						label={t("toolbar.clear")}
						icon="trash"
						onClick={onClear}
						danger
					/>
				</div>
			)}
		</BottomSheet>
	);
}
