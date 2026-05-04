import { useTranslation } from "react-i18next";
import { TagList } from "./TagList.js";

export function HeroSection() {
	const { t } = useTranslation();

	return (
		<div className="order-1 flex flex-col px-5 pt-18 pb-6 md:flex-1 md:justify-center md:px-[clamp(40px,6vw,80px)] md:py-15">
			<div className="mb-7 flex items-center gap-2.5 md:mb-9">
				<img src="/logo.svg" alt="Snippaste" className="w-9 h-9 rounded-9" />
				<span className="text-sm font-bold tracking-[0.06em] text-fg-3 uppercase">
					Snippaste
				</span>
			</div>

			<h1 className="mb-4 text-[clamp(32px,10vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg md:mb-5.5 md:text-[clamp(36px,4.5vw,52px)]">
				{t("landing.heading1")}
				<br />
				<span className="text-accent">{t("landing.heading2")}</span>
			</h1>

			<p className="mb-6 max-w-95 text-sm leading-relaxed text-fg-2 md:mb-10 md:text-base">
				{t("landing.description")}
			</p>

			<TagList />
		</div>
	);
}
