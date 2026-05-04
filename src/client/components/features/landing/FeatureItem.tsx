import { useTranslation } from "react-i18next";
import { Icon } from "@/client/Icon.js";

export interface FeatureItemProps {
	icon: string;
	labelKey: string;
	descKey: string;
}

export function FeatureItem({ icon, labelKey, descKey }: FeatureItemProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2.5">
			<div className="w-7 h-7 rounded-md bg-accent-soft-08 border border-accent-soft-14 flex items-center justify-center shrink-0">
				<Icon name={icon} size={13} color="var(--accent)" />
			</div>
			<div className="text-xs">
				<span className="font-semibold text-fg-2">{t(labelKey)}</span>
				<span className="text-fg-3"> — {t(descKey)}</span>
			</div>
		</div>
	);
}
