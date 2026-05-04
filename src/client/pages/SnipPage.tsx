import { ClearConfirmDialog } from "@/client/components/features/snip/ClearConfirmDialog";
import { ErrorBanner } from "@/client/components/features/snip/ErrorBanner";
import { LockScreen } from "@/client/components/features/snip/LockScreen";
import { QrModalWrapper } from "@/client/components/features/snip/QrModalWrapper";
import { RefreshConfirmDialog } from "@/client/components/features/snip/RefreshConfirmDialog";
import { RemoteChangesBanner } from "@/client/components/features/snip/RemoteChangesBanner";
import { SettingsModalWrapper } from "@/client/components/features/snip/SettingsModalWrapper";
import { SnipEditor } from "@/client/components/features/snip/SnipEditor";
import { StatusBar } from "@/client/components/features/snip/StatusBar";
import { Toolbar } from "@/client/components/features/snip/Toolbar/index";
import { useSnipPage } from "@/client/components/features/snip/useSnipPage";

export function SnipPage() {
	const {
		slug,
		isLocked,
		loadError,
		remoteChanged,
		toolbarProps,
		editorProps,
		lockScreenProps,
		dialogsProps,
	} = useSnipPage();

	return (
		<div className="flex h-[100dvh] flex-col bg-bg md:h-screen">
			<Toolbar {...toolbarProps} />
			<ErrorBanner loadError={loadError} />
			<RemoteChangesBanner
				remoteChanged={remoteChanged}
				onRefresh={toolbarProps.onRefresh}
			/>
			{isLocked ? (
				<LockScreen {...lockScreenProps} />
			) : (
				<SnipEditor {...editorProps} />
			)}
			<StatusBar content={toolbarProps.content} />
			<ClearConfirmDialog
				open={dialogsProps.confirmClear}
				onConfirm={dialogsProps.onConfirmClear}
				onCancel={dialogsProps.onCancelClear}
			/>
			<RefreshConfirmDialog
				open={dialogsProps.confirmRefresh}
				onConfirm={dialogsProps.onConfirmRefresh}
				onCancel={dialogsProps.onCancelRefresh}
			/>
			<QrModalWrapper
				open={dialogsProps.showQr}
				slug={slug}
				onClose={dialogsProps.onCloseQr}
			/>
			<SettingsModalWrapper
				open={dialogsProps.showSettings}
				onClose={dialogsProps.onCloseSettings}
				isProtected={dialogsProps.isProtected}
				onSetPassword={dialogsProps.onSetPassword}
				onRemovePassword={dialogsProps.onRemovePassword}
				onLock={dialogsProps.onLock}
			/>
		</div>
	);
}
