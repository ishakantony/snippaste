import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import {
	type FormEvent,
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
	AUTOSAVE_STATUS,
	AutosaveController,
} from "@/client/autosaveController.js";
import { ConfirmDialog } from "@/client/ConfirmDialog.js";
import { getClientId } from "@/client/clientId.js";
import { SettingsModal } from "@/client/components/SettingsModal.js";
import { useDocumentLanguage } from "@/client/hooks/useDocumentLanguage.js";
import { StatusBar } from "@/client/StatusBar.js";
import { subscribe as subscribeStream } from "@/client/snipStream.js";
import { useAutoSaveSettings } from "@/client/stores/autoSaveSettingsStore.js";
import { useFeatureFlag } from "@/client/stores/featureFlagsStore.js";
import { useSnipSessionStore } from "@/client/stores/snipSessionStore.js";
import { useTheme } from "@/client/stores/themeStore.js";
import { useToast } from "@/client/stores/toastStore.js";
import { Toolbar } from "@/client/Toolbar.js";
import { THEME } from "@/client/theme.js";

const QrModal = lazy(() =>
	import("@/client/components/QrModal.js").then((m) => ({
		default: m.QrModal,
	})),
);

const baseEditorTheme = EditorView.theme({
	"&": { height: "100%", fontSize: "13px", fontFamily: "var(--font-mono)" },
	".cm-scroller": {
		overflow: "auto",
		lineHeight: "22px",
		fontFamily: "var(--font-mono)",
	},
	".cm-content": { padding: "14px 0", caretColor: "var(--accent)" },
	".cm-line": { padding: "0 20px" },
});

const lightTheme = EditorView.theme({
	"&": { background: "var(--editor-bg)", color: "var(--editor-fg)" },
	".cm-gutters": {
		width: "52px",
		background: "var(--gutter-bg)",
		color: "var(--gutter-fg)",
		border: "none",
		borderRight: "1px solid var(--border)",
		fontFamily: "var(--font-mono)",
	},
	".cm-lineNumbers .cm-gutterElement": {
		padding: "0 14px 0 0",
		fontSize: "12px",
		color: "var(--gutter-fg)",
		minWidth: "52px",
	},
	".cm-cursor": { borderLeftColor: "var(--accent)" },
	".cm-selectionBackground": { background: "var(--accent-soft-12) !important" },
	".cm-focused .cm-selectionBackground": {
		background: "var(--accent-soft-12) !important",
	},
	".cm-activeLineGutter": { background: "var(--surface-2)" },
	".cm-activeLine": { background: "transparent" },
});

const darkOverride = EditorView.theme({
	"&": {
		background: "var(--editor-bg) !important",
		color: "var(--editor-fg) !important",
	},
	".cm-gutters": {
		width: "52px",
		background: "var(--gutter-bg) !important",
		color: "var(--gutter-fg) !important",
		border: "none !important",
		borderRight: "1px solid var(--border) !important",
		fontFamily: "var(--font-mono)",
	},
	".cm-lineNumbers .cm-gutterElement": {
		padding: "0 14px 0 0",
		fontSize: "12px",
		minWidth: "52px",
	},
	".cm-cursor": { borderLeftColor: "var(--accent) !important" },
	".cm-activeLineGutter": { background: "var(--surface-2) !important" },
	".cm-activeLine": { background: "transparent !important" },
});

function buildExtensions(
	dark: boolean,
	updateListener: ReturnType<typeof EditorView.updateListener.of>,
) {
	const themeExts = dark ? [oneDark, darkOverride] : [lightTheme];
	return [
		lineNumbers(),
		EditorView.lineWrapping,
		keymap.of(defaultKeymap),
		updateListener,
		baseEditorTheme,
		...themeExts,
	];
}

function SnipPageInner() {
	const { name } = useParams<{ name: string }>();
	const slug = name ?? "untitled";
	const { theme } = useTheme();
	const dark = theme === THEME.DARK;
	const toast = useToast();
	const { t } = useTranslation();
	const qrEnabled = useFeatureFlag("qrCode");
	const autoSaveFeatureEnabled = useFeatureFlag("autoSave");
	const passwordProtectionEnabled = useFeatureFlag("passwordProtection");
	const { enabled: autoSaveEnabled, toggle: toggleAutoSave } =
		useAutoSaveSettings();
	const autoSaveActive = autoSaveFeatureEnabled && autoSaveEnabled;

	useDocumentLanguage(slug);

	const loadError = useSnipSessionStore((state) => state.loadError);
	const remoteChanged = useSnipSessionStore((state) => state.remoteChanged);
	const updatedAt = useSnipSessionStore((state) => state.updatedAt);
	const isLocked = useSnipSessionStore((state) => state.isLocked);
	const isProtected = useSnipSessionStore((state) => state.isProtected);
	const resetForSlug = useSnipSessionStore((state) => state.resetForSlug);
	const setLoadError = useSnipSessionStore((state) => state.setLoadError);
	const setSaveState = useSnipSessionStore((state) => state.setSaveState);
	const setRemoteChanged = useSnipSessionStore(
		(state) => state.setRemoteChanged,
	);
	const setUpdatedAt = useSnipSessionStore((state) => state.setUpdatedAt);
	const setLocked = useSnipSessionStore((state) => state.setLocked);
	const setProtected = useSnipSessionStore((state) => state.setProtected);
	const [content, setContent] = useState("");
	const [confirmClear, setConfirmClear] = useState(false);
	const [confirmRefresh, setConfirmRefresh] = useState(false);
	const [showQr, setShowQr] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [unlockPassword, setUnlockPassword] = useState("");
	const [unlockError, setUnlockError] = useState<string | null>(null);

	const controllerRef = useRef<AutosaveController | null>(null);
	const editorContainerRef = useRef<HTMLDivElement>(null);
	const editorViewRef = useRef<EditorView | null>(null);
	const clientIdRef = useRef<string>(getClientId());
	// Mirrors the editor's current doc so we can rebuild the view (e.g. on theme
	// toggle) without losing content. Updated by the editor's updateListener and
	// by every code path that dispatches changes (initial load, SSE update,
	// clear, refresh).
	const docRef = useRef<string>("");
	// True while we're dispatching a programmatic change (initial load, SSE
	// update, refresh, clear) — suppresses the autosave trigger so we don't
	// PUT remote content back to the server.
	const applyingRef = useRef<boolean>(false);

	useLayoutEffect(() => {
		resetForSlug(slug);
	}, [slug, resetForSlug]);

	// Autosave controller
	useEffect(() => {
		const controller = new AutosaveController({
			fetch: (url, init) => fetch(url, init),
			setTimeout: (fn, ms) => window.setTimeout(fn, ms),
			clearTimeout: (id) => window.clearTimeout(id),
			dateNow: () => Date.now(),
			url: `/api/snips/${encodeURIComponent(slug)}`,
			clientId: clientIdRef.current,
			enabled: autoSaveActive,
		});

		controllerRef.current = controller;

		const unsub = controller.subscribe((state) => {
			setSaveState(state);
			if (state.status === AUTOSAVE_STATUS.LOCKED) setLocked(true);
		});

		return () => {
			unsub();
			controllerRef.current = null;
		};
	}, [slug, autoSaveActive, setSaveState, setLocked]);

	// CodeMirror editor — re-create on theme change to apply new tokens.
	// docRef survives across the cleanup so content persists through the rebuild.
	useEffect(() => {
		if (isLocked) return;
		if (!editorContainerRef.current) return;

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const text = update.state.doc.toString();
				docRef.current = text;
				if (!applyingRef.current) {
					controllerRef.current?.onChange(text);
				}
				setContent(text);
			}
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: docRef.current,
				extensions: buildExtensions(dark, updateListener),
			}),
			parent: editorContainerRef.current,
		});

		editorViewRef.current = view;

		return () => {
			view.destroy();
			if (editorViewRef.current === view) editorViewRef.current = null;
		};
	}, [dark, isLocked]);

	// Initial fetch
	useEffect(() => {
		setLoadError(false);
		setUnlockError(null);

		fetch(`/api/snips/${encodeURIComponent(slug)}`)
			.then((res) => {
				if (res.status === 404) return null;
				if (res.status === 401) {
					setLocked(true);
					setProtected(true);
					return null;
				}
				if (!res.ok) throw new Error("fetch failed");
				return res.json() as Promise<{
					slug: string;
					content: string;
					updatedAt: number;
					protected: boolean;
				}>;
			})
			.then((data) => {
				if (!data) return;
				setLocked(false);
				setProtected(data.protected);
				setUpdatedAt(data.updatedAt);
				const view = editorViewRef.current;
				if (!view) return;
				applyingRef.current = true;
				try {
					view.dispatch({
						changes: {
							from: 0,
							to: view.state.doc.length,
							insert: data.content,
						},
					});
				} finally {
					applyingRef.current = false;
				}
			})
			.catch(() => {
				setLoadError(true);
			});
	}, [slug, setLoadError, setLocked, setProtected, setUpdatedAt]);

	// SSE subscription — receive remote updates
	useEffect(() => {
		if (isLocked) return;
		const myClientId = clientIdRef.current;

		const unsub = subscribeStream(slug, {
			onSnapshot: (event) => {
				if (event.updatedAt > 0) {
					setUpdatedAt(event.updatedAt);
				}
			},
			onUpdate: (event) => {
				setUpdatedAt(event.updatedAt);
				if (event.clientId === myClientId) return; // self-echo
				const status = controllerRef.current?.getState().status;
				const isLocallyDirty =
					status === AUTOSAVE_STATUS.DIRTY || status === AUTOSAVE_STATUS.SAVING;

				if (isLocallyDirty) {
					setRemoteChanged(true);
					return;
				}

				const view = editorViewRef.current;
				if (!view) return;
				if (view.state.doc.toString() === event.content) return;
				applyingRef.current = true;
				try {
					view.dispatch({
						changes: {
							from: 0,
							to: view.state.doc.length,
							insert: event.content,
						},
					});
				} finally {
					applyingRef.current = false;
				}
				setRemoteChanged(false);
			},
		});

		return () => unsub();
	}, [slug, isLocked, setRemoteChanged, setUpdatedAt]);

	// beforeunload warning when auto-save is off and there are unsaved changes
	useEffect(() => {
		if (autoSaveActive) return;

		function onBeforeUnload(e: BeforeUnloadEvent) {
			const status = controllerRef.current?.getState().status;
			if (
				status === AUTOSAVE_STATUS.DIRTY ||
				status === AUTOSAVE_STATUS.SAVING
			) {
				e.preventDefault();
				e.returnValue = "";
			}
		}

		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [autoSaveActive]);

	const handleSave = useCallback(() => {
		controllerRef.current?.flush();
		toast.show(t("editor.saved"));
	}, [toast, t]);

	// Ctrl+S / Cmd+S to manually save when auto-save is off
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleSave]);

	function getContent(): string {
		return editorViewRef.current?.state.doc.toString() ?? "";
	}

	function applyContent(text: string, opts: { silent?: boolean } = {}) {
		const view = editorViewRef.current;
		if (!view) return;
		if (opts.silent) applyingRef.current = true;
		try {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: text },
			});
		} finally {
			if (opts.silent) applyingRef.current = false;
		}
	}

	function handleCopyUrl() {
		const url = `${window.location.origin}/s/${slug}`;
		navigator.clipboard.writeText(url).catch(() => {});
		toast.show(t("editor.copiedUrl", { slug }));
	}

	function handleQr() {
		setShowQr(true);
	}

	function getSnipUrl(): string {
		return `${window.location.origin}/s/${slug}`;
	}

	function handleCopyContent() {
		navigator.clipboard.writeText(getContent()).catch(() => {});
		toast.show(t("editor.copiedClipboard"));
	}

	function handleClear() {
		setConfirmClear(true);
	}

	function doClear() {
		applyContent("");
		setConfirmClear(false);
		toast.show(t("editor.snipCleared"));
	}

	function handleRefresh() {
		setConfirmRefresh(true);
	}

	function doRefresh() {
		setConfirmRefresh(false);
		fetch(`/api/snips/${encodeURIComponent(slug)}`)
			.then((res) => {
				if (res.status === 404) return null;
				if (res.status === 401) {
					setLocked(true);
					return null;
				}
				if (!res.ok) throw new Error("fetch failed");
				return res.json() as Promise<{
					slug: string;
					content: string;
					updatedAt: number;
				}>;
			})
			.then((data) => {
				applyContent(data?.content ?? "", { silent: true });
				setRemoteChanged(false);
				toast.show(t("editor.reloaded"));
			})
			.catch(() => {
				setLoadError(true);
			});
	}

	async function handleUnlock(e?: FormEvent) {
		e?.preventDefault();
		setUnlockError(null);
		const res = await fetch(`/api/snips/${encodeURIComponent(slug)}/unlock`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: unlockPassword }),
		});
		if (!res.ok) {
			setUnlockError(
				res.status === 429
					? t("editor.unlockRateLimited")
					: t("editor.unlockFailed"),
			);
			return;
		}
		setUnlockPassword("");
		setLocked(false);
		setProtected(true);
		doRefresh();
	}

	async function handleSetPassword(password: string) {
		if (updatedAt === undefined && !isProtected) {
			controllerRef.current?.setInitialPassword(password);
			setProtected(true);
			toast.show(t("editor.protectionUpdated"));
			return;
		}

		const res = await fetch(`/api/snips/${encodeURIComponent(slug)}/password`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password }),
		});
		if (!res.ok) {
			if (res.status === 401) setLocked(true);
			setLoadError(true);
			return;
		}
		await fetch(`/api/snips/${encodeURIComponent(slug)}/unlock`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password }),
		});
		setProtected(true);
		toast.show(t("editor.protectionUpdated"));
	}

	async function handleRemovePassword() {
		const res = await fetch(`/api/snips/${encodeURIComponent(slug)}/password`, {
			method: "DELETE",
		});
		if (!res.ok) {
			if (res.status === 401) setLocked(true);
			setLoadError(true);
			return;
		}
		controllerRef.current?.setInitialPassword(null);
		setProtected(false);
		toast.show(t("editor.protectionRemoved"));
	}

	async function handleLock() {
		await fetch(`/api/snips/${encodeURIComponent(slug)}/lock`, {
			method: "POST",
		});
		setLocked(isProtected);
		setShowSettings(false);
		toast.show(t("editor.lockedNow"));
	}

	return (
		<div className="flex flex-col h-screen bg-bg">
			<Toolbar
				slug={slug}
				onCopyUrl={handleCopyUrl}
				onCopyContent={handleCopyContent}
				onSave={handleSave}
				onClear={handleClear}
				onRefresh={handleRefresh}
				onQr={handleQr}
				onSettings={() => setShowSettings(true)}
				autoSaveEnabled={autoSaveActive}
				autoSaveFeatureEnabled={autoSaveFeatureEnabled}
			/>

			{loadError && (
				<div className="px-4 py-1.5 bg-danger/10 border-b border-danger/30 font-mono text-xs tracking-wide text-danger shrink-0">
					{t("editor.loadError")}
				</div>
			)}

			{remoteChanged && (
				<div className="px-4 py-1 bg-accent-soft-10 border-b border-accent-soft-18 text-xs text-accent-hover shrink-0 flex items-center gap-2">
					<span>{t("editor.remoteChanges")}</span>
					<button
						type="button"
						className="bg-transparent border border-accent-soft-20 text-accent-hover px-2 py-0.5 rounded-5 text-xs font-medium cursor-pointer"
						onClick={handleRefresh}
					>
						{t("toolbar.refresh")}
					</button>
				</div>
			)}

			{isLocked ? (
				<div className="flex-1 flex items-center justify-center px-6">
					<form
						className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 shadow-sm"
						onSubmit={handleUnlock}
					>
						<h2 className="text-lg font-bold text-fg mb-2">
							{t("editor.lockedTitle")}
						</h2>
						<p className="text-sm text-fg-3 mb-5">
							{t("editor.lockedDescription", { slug })}
						</p>
						<label htmlFor="unlock-password" className="text-xs text-fg-2">
							{t("editor.password")}
						</label>
						<input
							id="unlock-password"
							type="password"
							value={unlockPassword}
							onChange={(e) => setUnlockPassword(e.target.value)}
							className="mt-1 w-full h-10 px-3 bg-input-bg border border-border-2 rounded-lg text-fg outline-none focus:border-accent"
						/>
						{unlockError && (
							<div className="text-xs text-danger mt-2">{unlockError}</div>
						)}
						<button
							type="submit"
							className="mt-4 w-full h-10 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
							disabled={unlockPassword.length < 4}
						>
							{t("editor.unlock")}
						</button>
					</form>
				</div>
			) : (
				<div className="flex-1 flex overflow-hidden">
					<div
						ref={editorContainerRef}
						data-testid="snip-editor"
						className="flex-1 overflow-hidden flex flex-col"
					/>
				</div>
			)}

			<StatusBar content={content} />

			{confirmClear && (
				<ConfirmDialog
					message={t("editor.confirmClearMessage")}
					confirmLabel={t("editor.confirmClearLabel")}
					onConfirm={doClear}
					onCancel={() => setConfirmClear(false)}
				/>
			)}

			{confirmRefresh && (
				<ConfirmDialog
					message={t("editor.confirmRefreshMessage")}
					confirmLabel={t("editor.confirmRefreshLabel")}
					onConfirm={doRefresh}
					onCancel={() => setConfirmRefresh(false)}
				/>
			)}

			{showQr && qrEnabled && (
				<Suspense fallback={null}>
					<QrModal
						url={getSnipUrl()}
						slug={slug}
						onClose={() => setShowQr(false)}
						onToast={toast.show}
					/>
				</Suspense>
			)}

			{(autoSaveFeatureEnabled || passwordProtectionEnabled) && (
				<SettingsModal
					open={showSettings}
					enabled={autoSaveEnabled}
					onToggle={toggleAutoSave}
					onClose={() => setShowSettings(false)}
					autoSaveFeatureEnabled={autoSaveFeatureEnabled}
					passwordProtectionEnabled={passwordProtectionEnabled}
					isProtected={isProtected}
					onSetPassword={handleSetPassword}
					onRemovePassword={handleRemovePassword}
					onLock={handleLock}
				/>
			)}
		</div>
	);
}

export function SnipPage() {
	return <SnipPageInner />;
}
