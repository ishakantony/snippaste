import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, type ButtonProps } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import i18n, { STORAGE_KEY } from "@/client/i18n/index.js";
import { cn } from "@/client/lib/cn.js";

const LANGUAGES = [{ code: "en", label: "English" }] as const;

interface LanguageSwitcherProps {
	variant?: ButtonProps["variant"];
	size?: ButtonProps["size"];
	className?: string;
}

export function LanguageSwitcher({
	variant = "ghost",
	size = "sm",
	className,
}: LanguageSwitcherProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	function select(code: string) {
		i18n.changeLanguage(code);
		localStorage.setItem(STORAGE_KEY, code);
		setOpen(false);
	}

	function toggle() {
		setOpen((prev) => !prev);
	}

	const current =
		LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

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
				<Icon name="globe" size={13} />
				{variant !== "icon" && current.code.toUpperCase()}
			</Button>
			{open && (
				<div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-2 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1 z-50 min-w-28">
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
