import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import { SlugGenerator } from "@/client/slugGenerator.js";
import { useTheme } from "@/client/themeContext.js";
import { SlugValidator } from "@/shared/slugValidator.js";

const FEATURES = [
	{ icon: "zap", label: "Instant", desc: "Shareable URL in one click" },
	{ icon: "copy", label: "Plain text", desc: "No markup, no clutter" },
	{ icon: "shield", label: "Ephemeral", desc: "Snips expire after 30 days" },
] as const;

const TAGS = [
	"Plain text only",
	"Instant links",
	"No account",
	"30-day expiry",
];

export function LandingPage() {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const { theme, toggle } = useTheme();
	const dark = theme === "dark";

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim().toLowerCase();

		if (trimmed === "") {
			navigate(`/s/${SlugGenerator.generate()}`);
			return;
		}

		const result = SlugValidator.validate(trimmed);
		if (!result.ok) {
			setError(result.reason);
			return;
		}

		setError(null);
		navigate(`/s/${result.slug}`);
	}

	return (
		<div className="w-screen h-screen flex bg-bg relative overflow-hidden">
			<Button
				variant="ghost"
				size="sm"
				className="absolute top-5 right-5 z-10 border border-border rounded-md px-3 py-1.5 text-fg-3 text-xs font-medium"
				onClick={toggle}
				aria-label="Toggle theme"
			>
				<Icon name={dark ? "sun" : "moon"} size={13} />
				{dark ? "light mode" : "dark mode"}
			</Button>

			<div className="flex-1 flex flex-col justify-center px-[clamp(40px,6vw,80px)] py-15">
				<div className="flex items-center gap-2.5 mb-9">
					<img src="/logo.svg" alt="Snippaste" className="w-9 h-9 rounded-9" />
					<span className="text-sm font-bold tracking-[0.06em] text-fg-3 uppercase">
						Snippaste
					</span>
				</div>

				<h1 className="text-[clamp(36px,4.5vw,52px)] font-bold tracking-[-0.03em] text-fg leading-[1.08] mb-5.5">
					Share text.
					<br />
					<span className="text-accent">Instantly.</span>
				</h1>

				<p className="text-base text-fg-2 leading-relaxed max-w-95 mb-10">
					Create a snip, get a link. Share code snippets, notes, or anything in
					plain text — no signup, no setup.
				</p>

				<div className="flex gap-2 flex-wrap">
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

			<div className="w-px bg-border my-12 shrink-0" />

			<div className="w-[clamp(300px,34vw,420px)] flex items-center justify-center px-[clamp(28px,4vw,56px)] py-12 shrink-0">
				<form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
					<div>
						<div className="text-lg font-bold tracking-[-0.01em] text-fg mb-1.5">
							New snip
						</div>
						<div className="text-sm text-fg-3 leading-relaxed">
							You'll get a shareable URL right away. Start typing in the editor.
						</div>
					</div>

					<div className="flex flex-col gap-1.75">
						<label
							className="text-xs font-semibold text-fg-3 tracking-[0.07em] uppercase"
							htmlFor="snip-name"
						>
							Snip name
						</label>
						<input
							id="snip-name"
							type="text"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError(null);
							}}
							placeholder="e.g. my-config (optional)"
							className="w-full h-11 px-3.5 bg-input-bg border border-border-2 rounded-lg text-fg text-sm font-mono outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft-18)] placeholder:text-fg-3 placeholder:opacity-65"
							spellCheck={false}
							autoCapitalize="off"
							autoCorrect="off"
						/>
						<div className="text-xs text-fg-3">
							Leave blank to get a random ID
						</div>
						{error && (
							<div className="text-xs text-danger tracking-wide">{error}</div>
						)}
					</div>

					<Button variant="primary" size="lg" className="w-full">
						Create snip
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
						Snips are public. Do not paste sensitive data. Content expires and
						is removed after 30 days.
					</div>
				</form>
			</div>
		</div>
	);
}
