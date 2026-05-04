import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { AUTOSAVE_STATUS } from "@/client/autosaveController.js";
import { useDocumentLanguage } from "@/client/hooks/useDocumentLanguage.js";
import { useAutoSaveSettings } from "@/client/stores/autoSaveSettingsStore.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";
import { useSnipSessionStore } from "@/client/stores/snipSessionStore.js";
import { useTheme } from "@/client/stores/themeStore.js";
import { useToast } from "@/client/stores/toastStore.js";
import { THEME } from "@/client/theme.js";
import { useSnipEditor } from "./useSnipEditor.js";
import { useSnipPassword } from "./useSnipPassword.js";
import { useSnipSession } from "./useSnipSession.js";

export function useSnipPage() {
	const { name } = useParams<{ name: string }>();
	const slug = name ?? "untitled";
	const { theme } = useTheme();
	const dark = theme === THEME.DARK;
	const toast = useToast();
	const { t } = useTranslation();
	const qrEnabled = useFeatureFlag("qrCode");
	const autoSaveFeatureEnabled = useFeatureFlag("autoSave");
	const passwordProtectionEnabled = useFeatureFlag("passwordProtection");
	const { enabled: autoSaveEnabled } = useAutoSaveSettings();
	const autoSaveActive = autoSaveFeatureEnabled && autoSaveEnabled;
	const isProtected = useSnipSessionStore((state) => state.isProtected);
	const setSaveState = useSnipSessionStore((state) => state.setSaveState);
	const setLocked = useSnipSessionStore((state) => state.setLocked);
	const setProtected = useSnipSessionStore((state) => state.setProtected);
	const [confirmClear, setConfirmClear] = useState(false);
	const [confirmRefresh, setConfirmRefresh] = useState(false);
	const [showQr, setShowQr] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [liveContent, setLiveContent] = useState("");
	const onChangeRef = useRef<((text: string) => void) | undefined>(undefined);

	useDocumentLanguage(slug);

	const editorRef = useRef<ReturnType<typeof useSnipEditor> | null>(null);

	const session = useSnipSession(slug, {
		autoSaveActive,
		onRemoteContent: useCallback((content: string) => {
			editorRef.current?.applyContent(content, { silent: true });
			setLiveContent(content);
		}, []),
	});

	onChangeRef.current = session.onEditorChange;

	const editor = useSnipEditor({
		isLocked: session.isLocked,
		dark,
		onChange: useCallback((text: string) => {
			onChangeRef.current?.(text);
			setLiveContent(text);
		}, []),
	});

	editorRef.current = editor;

	const password = useSnipPassword(slug, {
		onUnlock: useCallback(() => {
			setLocked(false);
			setSaveState({ status: AUTOSAVE_STATUS.IDLE });
			setProtected(true);
			session.refresh();
		}, [setLocked, setSaveState, setProtected, session]),
		setInitialPassword: session.setInitialPassword,
	});

	const handleSave = useCallback(() => {
		session.flush();
		toast.show(t("editor.saved"));
	}, [session, toast, t]);

	const handleCopyUrl = useCallback(() => {
		const url = `${window.location.origin}/s/${slug}`;
		navigator.clipboard.writeText(url).catch(() => {});
		toast.show(t("editor.copiedUrl", { slug }));
	}, [slug, toast, t]);

	const handleCopyContent = useCallback(() => {
		navigator.clipboard.writeText(editor.getContent()).catch(() => {});
		toast.show(t("editor.copiedClipboard"));
	}, [editor, toast, t]);

	const handleClear = useCallback(() => {
		setConfirmClear(true);
	}, []);

	const doClear = useCallback(() => {
		editor.applyContent("");
		setConfirmClear(false);
		toast.show(t("editor.snipCleared"));
	}, [editor, toast, t]);

	const handleRefresh = useCallback(() => {
		setConfirmRefresh(true);
	}, []);

	const doRefresh = useCallback(async () => {
		setConfirmRefresh(false);
		await session.refresh();
		toast.show(t("editor.reloaded"));
	}, [session, toast, t]);

	const handleQr = useCallback(() => {
		setShowQr(true);
	}, []);

	const handleSettings = useCallback(() => {
		setShowSettings(true);
	}, []);

	const handleSetPassword = useCallback(
		async (newPassword: string) => {
			const updatedAt = session.updatedAt;
			const isExisting = updatedAt !== undefined || isProtected;
			if (!isExisting) {
				session.setInitialPassword(newPassword);
				setProtected(true);
				toast.show(t("editor.protectionUpdated"));
				return;
			}
			try {
				await password.handleSetPassword(newPassword);
				setProtected(true);
				toast.show(t("editor.protectionUpdated"));
			} catch {
				toast.show(t("editor.unlockFailed"));
			}
		},
		[session, isProtected, setProtected, password, toast, t],
	);

	const handleRemovePassword = useCallback(async () => {
		try {
			await password.handleRemovePassword();
			setProtected(false);
			toast.show(t("editor.protectionRemoved"));
		} catch {
			toast.show(t("editor.unlockFailed"));
		}
	}, [password, setProtected, toast, t]);

	const handleLock = useCallback(async () => {
		try {
			await password.handleLock();
			setLocked(isProtected);
			if (isProtected) setSaveState({ status: AUTOSAVE_STATUS.LOCKED });
			setShowSettings(false);
			toast.show(t("editor.lockedNow"));
		} catch {
			toast.show(t("editor.unlockFailed"));
		}
	}, [password, isProtected, setLocked, setSaveState, toast, t]);

	return {
		slug,
		content: liveContent,
		isLocked: session.isLocked,
		loadError: session.loadError,
		remoteChanged: session.remoteChanged,
		toolbarProps: {
			slug,
			content: liveContent,
			onCopyUrl: handleCopyUrl,
			onCopyContent: handleCopyContent,
			onSave: handleSave,
			onClear: handleClear,
			onRefresh: handleRefresh,
			onQr: handleQr,
			onSettings: handleSettings,
			autoSaveEnabled: autoSaveActive,
			autoSaveFeatureEnabled,
			mobileOverlayOpen:
				confirmClear || confirmRefresh || showQr || showSettings,
		},
		editorProps: { containerRef: editor.containerRef },
		lockScreenProps: {
			slug,
			unlockPassword: password.unlockPassword,
			unlockError: password.unlockError,
			setUnlockPassword: password.setUnlockPassword,
			handleUnlock: password.handleUnlock,
		},
		dialogsProps: {
			confirmClear,
			confirmRefresh,
			showQr,
			showSettings,
			qrEnabled,
			autoSaveFeatureEnabled,
			passwordProtectionEnabled,
			isProtected,
			onConfirmClear: doClear,
			onCancelClear: () => setConfirmClear(false),
			onConfirmRefresh: doRefresh,
			onCancelRefresh: () => setConfirmRefresh(false),
			onCloseQr: () => setShowQr(false),
			onCloseSettings: () => setShowSettings(false),
			onSetPassword: handleSetPassword,
			onRemovePassword: handleRemovePassword,
			onLock: handleLock,
		},
	};
}
