import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/Button.js";
import { Modal } from "@/client/components/ui/Modal.js";

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

	return (
		<Modal onClose={onCancel} testId="confirm-dialog">
			<div className="w-full max-w-85 rounded-xl border border-border-2 bg-modal-bg p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] md:p-6">
				<div className="text-sm font-semibold text-fg mb-2">
					{t("editor.areYouSure")}
				</div>
				<div className="text-sm text-fg-2 leading-relaxed mb-5">{message}</div>
				<div className="flex justify-end gap-2">
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
		</Modal>
	);
}
