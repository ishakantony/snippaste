import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "@/client/i18n/index";

interface ErrorBoundaryProps {
	fallback?: ReactNode;
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}
			const t = i18n.t.bind(i18n);
			return (
				<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
					<div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-800">
						<h1 className="mb-2 text-xl font-semibold text-red-600 dark:text-red-400">
							{t("errorBoundary.title")}
						</h1>
						<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
							{t("errorBoundary.message")}
						</p>
						<button
							type="button"
							onClick={() => {
								this.setState({ hasError: false, error: null });
								window.location.reload();
							}}
							className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						>
							{t("common.reloadPage")}
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}
