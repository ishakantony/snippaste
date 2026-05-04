import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher";
import { Button } from "@/client/components/ui/Button";
import { Icon } from "@/client/Icon";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore";
import { useTheme } from "@/client/stores/themeStore";
import { THEME } from "@/client/theme";

export function HeaderActions() {
	const { theme, toggle } = useTheme();
	const { t } = useTranslation();
	const dark = theme === THEME.DARK;
	const langEnabled = useFeatureFlag("languageSwitcher");

	return (
		<div className="absolute top-4 right-4 z-10 flex items-center gap-2 md:top-5 md:right-5">
			{langEnabled && (
				<LanguageSwitcher
					variant="ghost"
					size="sm"
					className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-fg-3 md:px-3"
				/>
			)}
			<Button
				variant="ghost"
				size="sm"
				className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-fg-3 md:px-3"
				onClick={toggle}
				aria-label={t("common.toggleTheme")}
			>
				<Icon name={dark ? "sun" : "moon"} size={13} />
				<span className="hidden sm:inline">
					{dark ? t("common.lightMode") : t("common.darkMode")}
				</span>
			</Button>
		</div>
	);
}
