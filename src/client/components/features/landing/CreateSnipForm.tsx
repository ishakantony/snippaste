import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import { Disclaimer } from "./Disclaimer.js";
import { FeatureList } from "./FeatureList.js";

export interface CreateSnipFormProps {
	name: string;
	error: string | null;
	onNameChange: (name: string) => void;
	onSubmit: (e: React.FormEvent) => void;
}

export function CreateSnipForm({
	name,
	error,
	onNameChange,
	onSubmit,
}: CreateSnipFormProps) {
	const { t } = useTranslation();

	return (
		<div className="order-2 flex shrink-0 items-center justify-center px-5 pb-7 md:order-3 md:w-[clamp(300px,34vw,420px)] md:px-[clamp(28px,4vw,56px)] md:py-12">
			<form className="w-full flex flex-col gap-5" onSubmit={onSubmit}>
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
						onChange={(e) => onNameChange(e.target.value)}
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

				<FeatureList />

				<Disclaimer />
			</form>
		</div>
	);
}
