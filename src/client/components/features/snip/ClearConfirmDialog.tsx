import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/client/ConfirmDialog";

export interface ClearConfirmDialogProps {
	open: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ClearConfirmDialog({
	open,
	onConfirm,
	onCancel,
}: ClearConfirmDialogProps) {
	const { t } = useTranslation();
	if (!open) return null;

	return (
		<ConfirmDialog
			message={t("editor.confirmClearMessage")}
			confirmLabel={t("editor.confirmClearLabel")}
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>
	);
}
