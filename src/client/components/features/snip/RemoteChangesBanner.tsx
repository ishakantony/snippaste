import { useTranslation } from "react-i18next";

export interface RemoteChangesBannerProps {
	remoteChanged: boolean;
	onRefresh: () => void;
}

export function RemoteChangesBanner({
	remoteChanged,
	onRefresh,
}: RemoteChangesBannerProps) {
	const { t } = useTranslation();
	if (!remoteChanged) return null;

	return (
		<div className="px-4 py-1 bg-accent-soft-10 border-b border-accent-soft-18 text-xs text-accent-hover shrink-0 flex items-center gap-2">
			<span>{t("editor.remoteChanges")}</span>
			<button
				type="button"
				className="bg-transparent border border-accent-soft-20 text-accent-hover px-2 py-0.5 rounded-5 text-xs font-medium cursor-pointer"
				onClick={onRefresh}
			>
				{t("toolbar.refresh")}
			</button>
		</div>
	);
}
