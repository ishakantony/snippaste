import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
	AutosaveController,
	type AutosaveState,
} from "@/client/autosaveController.js";
import { ConfirmDialog } from "@/client/ConfirmDialog.js";
import { getClientId } from "@/client/clientId.js";
import { QrModal } from "@/client/components/QrModal.js";
import { useFeatureFlag } from "@/client/featureFlagsContext.js";
import { useDocumentLanguage } from "@/client/hooks/useDocumentLanguage.js";
import { StatusBar } from "@/client/StatusBar.js";
import { subscribe as subscribeStream } from "@/client/snipStream.js";
import { ToastProvider, useToast } from "@/client/Toast.js";
import { Toolbar } from "@/client/Toolbar.js";
import { useTheme } from "@/client/themeContext.js";

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
	const dark = theme === "dark";
	const toast = useToast();
	const { t } = useTranslation();
	const qrEnabled = useFeatureFlag("qrCode");

	useDocumentLanguage(slug);

	const [loadError, setLoadError] = useState(false);
	const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
	const [content, setContent] = useState("");
	const [confirmClear, setConfirmClear] = useState(false);
	const [confirmRefresh, setConfirmRefresh] = useState(false);
	const [remoteChanged, setRemoteChanged] = useState(false);
	const [showQr, setShowQr] = useState(false);

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

	// Autosave controller
	useEffect(() => {
		const controller = new AutosaveController({
			fetch: (url, init) => fetch(url, init),
			setTimeout: (fn, ms) => window.setTimeout(fn, ms),
			clearTimeout: (id) => window.clearTimeout(id),
			dateNow: () => Date.now(),
			url: `/api/snips/${encodeURIComponent(slug)}`,
			clientId: clientIdRef.current,
		});

		controllerRef.current = controller;

		const unsub = controller.subscribe((state) => setSaveState(state));

		return () => {
			unsub();
			controllerRef.current = null;
		};
	}, [slug]);

	// CodeMirror editor — re-create on theme change to apply new tokens.
	// docRef survives across the cleanup so content persists through the rebuild.
	useEffect(() => {
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
	}, [dark]);

	// Initial fetch
	useEffect(() => {
		setLoadError(false);

		fetch(`/api/snips/${encodeURIComponent(slug)}`)
			.then((res) => {
				if (res.status === 404) return null;
				if (!res.ok) throw new Error("fetch failed");
				return res.json() as Promise<{
					slug: string;
					content: string;
					updatedAt: number;
				}>;
			})
			.then((data) => {
				if (!data) return;
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
	}, [slug]);

	// SSE subscription — receive remote updates
	useEffect(() => {
		const myClientId = clientIdRef.current;

		const unsub = subscribeStream(slug, {
			onUpdate: (event) => {
				if (event.clientId === myClientId) return; // self-echo
				const status = controllerRef.current?.getState().status;
				const isLocallyDirty = status === "dirty" || status === "saving";

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
	}, [slug]);

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

	function handleSave() {
		controllerRef.current?.flush();
		toast.show(t("editor.saved"));
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

	const isDirty = saveState.status === "dirty" || saveState.status === "saving";

	return (
		<div className="flex flex-col h-screen bg-bg">
			<Toolbar
				slug={slug}
				saveState={saveState}
				isDirty={isDirty}
				onCopyUrl={handleCopyUrl}
				onCopyContent={handleCopyContent}
				onSave={handleSave}
				onClear={handleClear}
				onRefresh={handleRefresh}
				onQr={handleQr}
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

			<div className="flex-1 flex overflow-hidden">
				<div
					ref={editorContainerRef}
					className="flex-1 overflow-hidden flex flex-col"
				/>
			</div>

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
				<QrModal
					url={getSnipUrl()}
					slug={slug}
					onClose={() => setShowQr(false)}
					onToast={toast.show}
				/>
			)}
		</div>
	);
}

export function SnipPage() {
	return (
		<ToastProvider>
			<SnipPageInner />
		</ToastProvider>
	);
}
