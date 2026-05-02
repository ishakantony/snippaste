import { useTranslation } from "react-i18next";
import { Modal } from "@/client/components/ui/Modal.js";

export interface SettingsModalProps {
	open: boolean;
	enabled: boolean;
	onToggle: () => void;
	onClose: () => void;
}

export function SettingsModal({
	open,
	enabled,
	onToggle,
	onClose,
}: SettingsModalProps) {
	const { t } = useTranslation();

	if (!open) return null;

	return (
		<Modal onClose={onClose}>
			<div className="bg-modal-bg border border-border rounded-lg shadow-lg p-6 w-80">
				<h2 className="text-sm font-semibold text-fg mb-4">
					{t("settings.title")}
				</h2>

				<div className="flex items-center justify-between">
					<label htmlFor="autosave-switch" className="text-xs text-fg-2">
						{t("settings.autoSave")}
					</label>
					<button
						id="autosave-switch"
						type="button"
						role="switch"
						aria-checked={enabled}
						onClick={onToggle}
						className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
							enabled ? "bg-accent" : "bg-border-2"
						}`}
					>
						<span
							className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
								enabled ? "translate-x-4" : "translate-x-0"
							}`}
						/>
					</button>
				</div>
				<p className="text-xs text-fg-3 mt-1">
					{t("settings.autoSaveDescription")}
				</p>
			</div>
		</Modal>
	);
}
