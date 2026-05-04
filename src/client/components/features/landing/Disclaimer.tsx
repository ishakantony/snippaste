import { useTranslation } from "react-i18next";

export function Disclaimer() {
	const { t } = useTranslation();

	return (
		<div className="text-xs text-fg-3 leading-relaxed pt-1 border-t border-border">
			{t("landing.disclaimer")}
		</div>
	);
}
