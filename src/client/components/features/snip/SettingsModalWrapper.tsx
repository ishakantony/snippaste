import { SettingsModal } from "@/client/components/SettingsModal.js";
import { useAutoSaveSettings } from "@/client/stores/autoSaveSettingsStore.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";

export interface SettingsModalWrapperProps {
	open: boolean;
	onClose: () => void;
	isProtected: boolean;
	onSetPassword: (password: string) => Promise<void>;
	onRemovePassword: () => Promise<void>;
	onLock: () => Promise<void>;
}

export function SettingsModalWrapper({
	open,
	onClose,
	isProtected,
	onSetPassword,
	onRemovePassword,
	onLock,
}: SettingsModalWrapperProps) {
	const autoSaveFeatureEnabled = useFeatureFlag("autoSave");
	const passwordProtectionEnabled = useFeatureFlag("passwordProtection");
	const { enabled: autoSaveEnabled, toggle: toggleAutoSave } =
		useAutoSaveSettings();

	if (!open) return null;

	return (
		<SettingsModal
			open={open}
			enabled={autoSaveEnabled}
			onToggle={toggleAutoSave}
			onClose={onClose}
			autoSaveFeatureEnabled={autoSaveFeatureEnabled}
			passwordProtectionEnabled={passwordProtectionEnabled}
			isProtected={isProtected}
			onSetPassword={onSetPassword}
			onRemovePassword={onRemovePassword}
			onLock={onLock}
		/>
	);
}
