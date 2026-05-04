import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/client/components/LanguageSwitcher.js";
import { Button } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import { SlugGenerator } from "@/client/slugGenerator.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";
import { useTheme } from "@/client/stores/themeStore.js";
import { THEME } from "@/client/theme.js";
import { SlugValidator } from "@/shared/slugValidator.js";

export function LandingPage() {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { theme, toggle } = useTheme();
	const { t } = useTranslation();
	const dark = theme === THEME.DARK;
	const langEnabled = useFeatureFlag("languageSwitcher");

	const FEATURES = [
		{
			icon: "zap",
			label: t("landing.featureInstantLabel"),
			desc: t("landing.featureInstantDesc"),
		},
		{
			icon: "copy",
			label: t("landing.featurePlainLabel"),
			desc: t("landing.featurePlainDesc"),
		},
		{
			icon: "shield",
			label: t("landing.featureEphemeralLabel"),
			desc: t("landing.featureEphemeralDesc"),
		},
	];

	const TAGS = [
		t("landing.tagPlain"),
		t("landing.tagInstant"),
		t("landing.tagNoAccount"),
		t("landing.tagExpiry"),
	];

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim().toLowerCase();

		if (trimmed === "") {
			navigate(`/s/${SlugGenerator.generate()}`);
			return;
		}

		const result = SlugValidator.validate(trimmed);
		if (!result.ok) {
			setError(t(`errors.${result.reason}`));
			return;
		}

		setError(null);
		navigate(`/s/${result.slug}`);
	}

	return (
		<div className="relative flex min-h-[100dvh] w-screen flex-col overflow-x-hidden bg-bg md:h-screen md:flex-row md:overflow-hidden">
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

				<div className="hidden flex-wrap gap-2 md:flex">
					{TAGS.map((tag) => (
						<span
							key={tag}
							className="text-xs font-medium px-2.75 py-1.25 rounded-full bg-accent-soft-10 text-accent-hover border border-accent-soft-18"
						>
							{tag}
						</span>
					))}
				</div>
			</div>

			<div className="order-3 mx-5 h-px bg-border md:order-2 md:mx-0 md:my-12 md:h-auto md:w-px md:shrink-0" />

			<div className="order-2 flex shrink-0 items-center justify-center px-5 pb-7 md:order-3 md:w-[clamp(300px,34vw,420px)] md:px-[clamp(28px,4vw,56px)] md:py-12">
				<form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
					<div>
						<div className="text-lg font-bold tracking-[-0.01em] text-fg mb-1.5">
							{t("landing.newSnip")}
						</div>
						<div className="text-sm text-fg-3 leading-relaxed">
							{t("landing.formDesc")}
						</div>
					</div>

					<div className="flex flex-col gap-1.75">
						<label
							className="text-xs font-semibold text-fg-3 tracking-[0.07em] uppercase"
							htmlFor="snip-name"
						>
							{t("landing.snipName")}
						</label>
						<input
							id="snip-name"
							type="text"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError(null);
							}}
							placeholder={t("landing.placeholder")}
							className="h-12 w-full rounded-lg border border-border-2 bg-input-bg px-3.5 font-mono text-base text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-3 placeholder:opacity-65 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft-18)] md:h-11 md:text-sm"
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
						/>
						<div className="text-xs text-fg-3">{t("landing.helper")}</div>
						{error && (
							<div className="text-xs text-danger tracking-wide">{error}</div>
						)}
					</div>

					<Button variant="primary" size="lg" className="w-full">
						{t("landing.createSnip")}
						<Icon name="arrow" size={15} color="#fff" />
					</Button>

					<div className="h-px bg-border" />

					<div className="flex flex-col gap-3">
						{FEATURES.map((f) => (
							<div className="flex items-center gap-2.5" key={f.icon}>
								<div className="w-7 h-7 rounded-md bg-accent-soft-08 border border-accent-soft-14 flex items-center justify-center shrink-0">
									<Icon name={f.icon} size={13} color="var(--accent)" />
								</div>
								<div className="text-xs">
									<span className="font-semibold text-fg-2">{f.label}</span>
									<span className="text-fg-3"> — {f.desc}</span>
								</div>
							</div>
						))}
					</div>

					<div className="text-xs text-fg-3 leading-relaxed pt-1 border-t border-border">
						{t("landing.disclaimer")}
					</div>
				</form>
			</div>
		</div>
	);
}
