import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, type ButtonProps } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import type { Language } from "@/client/i18n/index.js";
import { cn } from "@/client/lib/cn.js";
import { useLanguage } from "@/client/stores/languageStore.js";

const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "zh", label: "简体中文" },
	{ code: "id", label: "Bahasa Indonesia" },
] as const;

interface LanguageSwitcherProps {
	variant?: ButtonProps["variant"];
	size?: ButtonProps["size"];
	className?: string;
	menuClassName?: string;
	iconSize?: number;
}

export function LanguageSwitcher({
	variant = "ghost",
	size = "sm",
	className,
	menuClassName,
	iconSize = 13,
}: LanguageSwitcherProps) {
	const { t } = useTranslation();
	const { language, setLanguage } = useLanguage();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	function select(code: Language) {
		setLanguage(code);
		setOpen(false);
	}

	function toggle() {
		setOpen((prev) => !prev);
	}

	const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

	return (
		<div ref={containerRef} className="relative">
			<Button
				variant={variant}
				size={size}
				className={className}
				onClick={toggle}
				aria-label={t("languageSwitcher.label")}
				title={t("languageSwitcher.label")}
			>
				<Icon name="globe" size={iconSize} />
				{variant !== "icon" && current.code.toUpperCase()}
			</Button>
			{open && (
				<div
					className={cn(
						"absolute right-0 top-full mt-1 bg-modal-bg border border-border-2 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1 z-50 min-w-28",
						menuClassName,
					)}
				>
					{LANGUAGES.map((lang) => (
						<button
							key={lang.code}
							type="button"
							onClick={() => select(lang.code)}
							className={cn(
								"w-full text-left px-3 py-1.5 text-xs font-medium cursor-pointer bg-transparent border-none",
								lang.code === current.code
									? "text-accent"
									: "text-fg-2 hover:text-fg",
							)}
						>
							{lang.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
