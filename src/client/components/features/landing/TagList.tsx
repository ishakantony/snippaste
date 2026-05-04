import { useTranslation } from "react-i18next";
import { TAG_KEYS } from "./constants";

export function TagList() {
	const { t } = useTranslation();

	return (
		<div className="hidden flex-wrap gap-2 md:flex">
			{TAG_KEYS.map((key) => (
				<span
					key={key}
					className="text-xs font-medium px-2.75 py-1.25 rounded-full bg-accent-soft-10 text-accent-hover border border-accent-soft-18"
				>
					{t(key)}
				</span>
			))}
		</div>
	);
}
