import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/client/ConfirmDialog";

export interface RefreshConfirmDialogProps {
	open: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function RefreshConfirmDialog({
	open,
	onConfirm,
	onCancel,
}: RefreshConfirmDialogProps) {
	const { t } = useTranslation();
	if (!open) return null;

	return (
		<ConfirmDialog
			message={t("editor.confirmRefreshMessage")}
			confirmLabel={t("editor.confirmRefreshLabel")}
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>
	);
}
