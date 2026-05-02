import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/Button.js";

export interface ConfirmDialogProps {
	message: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	message,
	confirmLabel,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const { t } = useTranslation();
	const label = confirmLabel ?? t("common.confirm");

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onCancel();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onCancel]);

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-[confirm-fade_150ms_ease]"
			role="dialog"
			aria-modal="true"
		>
			<div className="bg-modal-bg border border-border-2 rounded-xl w-85 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
				<div className="text-sm font-semibold text-fg mb-2">
					{t("editor.areYouSure")}
				</div>
				<div className="text-sm text-fg-2 leading-relaxed mb-5">{message}</div>
				<div className="flex gap-2 justify-end">
					<Button variant="ghost" size="md" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
					<Button
						variant="danger"
						size="md"
						className="bg-danger text-white font-semibold hover:bg-danger/90"
						onClick={onConfirm}
					>
						{label}
					</Button>
				</div>
			</div>
		</div>
	);
}
