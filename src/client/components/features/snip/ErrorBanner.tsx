import { useTranslation } from "react-i18next";

export interface ErrorBannerProps {
	loadError: boolean;
}

export function ErrorBanner({ loadError }: ErrorBannerProps) {
	const { t } = useTranslation();
	if (!loadError) return null;

	return (
		<div className="px-4 py-1.5 bg-danger/10 border-b border-danger/30 font-mono text-xs tracking-wide text-danger shrink-0">
			{t("editor.loadError")}
		</div>
	);
}
