import i18n from "@/client/i18n/index";

export function SnipPageLoadingFallback() {
	const t = i18n.t.bind(i18n);
	return (
		<div className="flex min-h-screen items-center justify-center bg-bg text-fg">
			<div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
				<div className="h-2.5 w-2.5 rounded-full bg-accent" />
				<p className="text-sm font-medium text-fg-2">
					{t("snipLoading.title")}
				</p>
			</div>
		</div>
	);
}
