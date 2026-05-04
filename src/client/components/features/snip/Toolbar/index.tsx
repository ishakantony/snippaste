import { DesktopToolbar } from "./DesktopToolbar";
import { MobileToolbar } from "./MobileToolbar";

export interface ToolbarProps {
	slug: string;
	content: string;
	onCopyUrl: () => void;
	onCopyContent: () => void;
	onSave: () => void;
	onClear: () => void;
	onRefresh: () => void;
	onQr: () => void;
	onSettings: () => void;
	autoSaveEnabled: boolean;
	autoSaveFeatureEnabled: boolean;
	mobileOverlayOpen?: boolean;
}

export function Toolbar(props: ToolbarProps) {
	return (
		<>
			<MobileToolbar {...props} />
			<DesktopToolbar {...props} />
		</>
	);
}
