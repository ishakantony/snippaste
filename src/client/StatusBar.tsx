import { useTranslation } from "react-i18next";

export interface StatusBarProps {
	content: string;
}

export function StatusBar({ content }: StatusBarProps) {
	const { t } = useTranslation();
	const lines = content.length === 0 ? 1 : content.split("\n").length;
	const chars = content.length;

	return (
		<div className="h-6.5 shrink-0 bg-surface border-t border-border flex items-center px-3.5 gap-4">
			<span className="text-2xs text-fg-3 font-mono">
				{t("status.lines", { count: lines })}
			</span>
			<span className="text-2xs text-fg-3 font-mono">
				{t("status.chars", { count: chars })}
			</span>
			<span className="text-2xs text-fg-3 font-mono ml-auto">
				{t("status.plainText")}
			</span>
		</div>
	);
}
