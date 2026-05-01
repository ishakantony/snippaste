import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { Toolbar } from "./Toolbar.js";
import { StatusBar } from "./StatusBar.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { ToastProvider, useToast } from "./Toast.js";
import { useTheme } from "./themeContext.js";
import { getClientId } from "./clientId.js";
import { subscribe as subscribeStream } from "./snipStream.js";

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", fontFamily: "var(--font-mono)" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px", fontFamily: "var(--font-mono)" },
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
  ".cm-focused .cm-selectionBackground": { background: "var(--accent-soft-12) !important" },
  ".cm-activeLineGutter": { background: "var(--surface-2)" },
  ".cm-activeLine": { background: "transparent" },
});

const darkOverride = EditorView.theme({
  "&": { background: "var(--editor-bg) !important", color: "var(--editor-fg) !important" },
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
  updateListener: ReturnType<typeof EditorView.updateListener.of>
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

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [content, setContent] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);

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

  // Page title
  useEffect(() => {
    document.title = `${slug} — Snippaste`;
  }, [slug]);

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
  }, [dark, slug]);

  // Initial fetch
  useEffect(() => {
    setLoadError(false);

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (!data) return;
        const view = editorViewRef.current;
        if (!view) return;
        applyingRef.current = true;
        try {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
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
            changes: { from: 0, to: view.state.doc.length, insert: event.content },
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
    toast.show(`Copied URL: /s/${slug}`);
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(getContent()).catch(() => {});
    toast.show("Copied to clipboard");
  }

  function handleSave() {
    controllerRef.current?.flush();
    toast.show("Saved");
  }

  function handleClear() {
    setConfirmClear(true);
  }

  function doClear() {
    applyContent("");
    setConfirmClear(false);
    toast.show("Snip cleared");
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
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        applyContent(data?.content ?? "", { silent: true });
        setRemoteChanged(false);
        toast.show("Reloaded");
      })
      .catch(() => {
        setLoadError(true);
      });
  }

  const isDirty = saveState.status === "dirty" || saveState.status === "saving";

  return (
    <div className="snip-page">
      <Toolbar
        slug={slug}
        saveState={saveState}
        isDirty={isDirty}
        onCopyUrl={handleCopyUrl}
        onCopyContent={handleCopyContent}
        onSave={handleSave}
        onClear={handleClear}
        onRefresh={handleRefresh}
      />

      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      {remoteChanged && (
        <div className="snip-remote-changed">
          <span>Remote changes available.</span>
          <button
            type="button"
            className="snip-remote-changed-btn"
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>
      )}

      <div className="snip-editor-wrap">
        <div ref={editorContainerRef} className="snip-editor" />
      </div>

      <StatusBar content={content} />

      {confirmClear && (
        <ConfirmDialog
          message="This will erase all content in this snip. This cannot be undone."
          confirmLabel="Clear"
          onConfirm={doClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmRefresh && (
        <ConfirmDialog
          message="Reload the last saved version? Any unsaved changes will be lost."
          confirmLabel="Refresh"
          onConfirm={doRefresh}
          onCancel={() => setConfirmRefresh(false)}
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
