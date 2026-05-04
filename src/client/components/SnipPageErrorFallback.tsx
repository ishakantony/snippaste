import i18n from "@/client/i18n/index";

export function SnipPageErrorFallback() {
	const t = i18n.t.bind(i18n);
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-800">
				<h1 className="mb-2 text-xl font-semibold text-red-600 dark:text-red-400">
					{t("snipFallback.title")}
				</h1>
				<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
					{t("snipFallback.message")}
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					{t("common.reloadPage")}
				</button>
			</div>
		</div>
	);
}
