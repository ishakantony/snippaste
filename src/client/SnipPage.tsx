import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { EditorState, Annotation } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { Toolbar } from "./Toolbar.js";
import { StatusBar } from "./StatusBar.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Toast, showToast } from "./Toast.js";
import { getClientId } from "./clientId.js";
import { subscribe } from "./snipStream.js";
import { useTheme } from "./themeContext.js";

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px" },
  ".cm-gutters": {
    width: "52px",
    background: "var(--gutter-bg)",
    borderRight: "1px solid var(--border)",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    lineHeight: "22px",
    color: "var(--gutter-fg)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    paddingRight: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: "52px",
  },
  ".cm-activeLineGutter": { background: "var(--surface-2)" },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-focused .cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-activeLine": { background: "transparent" },
});

const lightTheme = EditorView.theme({
  "&": { background: "var(--editor-bg)", color: "var(--editor-fg)" },
});

const darkOverride = EditorView.theme({
  "&": { background: "var(--editor-bg) !important" },
  ".cm-gutters": {
    background: "var(--gutter-bg) !important",
    borderRight: "1px solid var(--border) !important",
    border: "none !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent) !important" },
  ".cm-activeLineGutter": { background: "var(--surface-2) !important" },
});

const remoteChange = Annotation.define<boolean>();

function buildExtensions(dark: boolean, updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  const themeExts = dark ? [oneDark, darkOverride] : [lightTheme];
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, baseEditorTheme, ...themeExts];
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number>(0);

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const unsubscribeStreamRef = useRef<(() => void) | null>(null);
  const ourClientId = useRef(getClientId());

  // Initialize autosave controller
  useEffect(() => {
    const controller = new AutosaveController({
      fetch: (url, init) => fetch(url, init),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      dateNow: () => Date.now(),
      url: `/api/snips/${encodeURIComponent(slug)}`,
      clientId: ourClientId.current,
    });

    controllerRef.current = controller;

    const unsub = controller.subscribe((state) => {
      setSaveState(state);
      if (state.status === "saved") {
        setLastSavedAt(state.timestamp);
      }
    });

    return () => {
      unsub();
      controllerRef.current = null;
    };
  }, [slug]);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(remoteChange))) {
        controllerRef.current?.onChange(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: buildExtensions(dark, updateListener),
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      const currentView = editorViewRef.current ?? view;
      currentView.destroy();
      editorViewRef.current = null;
    };
  }, [slug]); // rebuild on slug change only; theme handled separately

  // Rebuild editor on theme change
  useEffect(() => {
    if (!editorContainerRef.current || !editorViewRef.current) return;

    const currentContent = editorViewRef.current.state.doc.toString();
    editorViewRef.current.destroy();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(remoteChange))) {
        controllerRef.current?.onChange(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: currentContent,
        extensions: buildExtensions(dark, updateListener),
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;
  }, [dark]);

  // Fetch initial content
  useEffect(() => {
    setLoadError(false);

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (data && editorViewRef.current) {
          const view = editorViewRef.current;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
            annotations: remoteChange.of(true),
          });
          setLastSavedAt(data.updatedAt);
        }
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [slug]);

  // Subscribe to SSE stream
  useEffect(() => {
    if (unsubscribeStreamRef.current) {
      unsubscribeStreamRef.current();
      unsubscribeStreamRef.current = null;
    }

    const unsub = subscribe(slug, {
      onSnapshot: (snapshot) => {
        if (editorViewRef.current) {
          const view = editorViewRef.current;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: snapshot.content },
            annotations: remoteChange.of(true),
          });
          setLastSavedAt(snapshot.updatedAt);
        }
      },
      onUpdate: (update) => {
        if (update.clientId === ourClientId.current) {
          return; // self-echo: ignore
        }

        const controllerState = controllerRef.current?.getState().status;
        if (controllerState === "dirty" || controllerState === "saving") {
          setRemoteChanged(true);
          return;
        }

        if (editorViewRef.current) {
          const view = editorViewRef.current;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: update.content },
            annotations: remoteChange.of(true),
          });
          setLastSavedAt(update.updatedAt);
          setRemoteChanged(false);
        }
      },
      onError: () => {
        // Auto-reconnect handled by EventSource natively
      },
    });

    unsubscribeStreamRef.current = unsub;

    return () => {
      unsub();
      unsubscribeStreamRef.current = null;
    };
  }, [slug]);

  function getContent(): string {
    return editorViewRef.current?.state.doc.toString() ?? "";
  }

  function handleClear(): void {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
      annotations: remoteChange.of(true),
    });
    controllerRef.current?.onChange("");
    setConfirmClear(false);
    showToast("Snip cleared");
  }

  function handleSave(): void {
    controllerRef.current?.flush();
    showToast("Saved");
  }

  function handleRefresh(): void {
    setConfirmRefresh(false);
    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (editorViewRef.current) {
          const view = editorViewRef.current;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
            annotations: remoteChange.of(true),
          });
          setLastSavedAt(data.updatedAt);
          setRemoteChanged(false);
          showToast("Reloaded from server");
        }
      })
      .catch(() => {
        showToast("Failed to refresh");
      });
  }

  function handleCopyUrl() {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast(`Copied: ${url}`);
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(getContent()).catch(() => {});
    showToast("Content copied to clipboard");
  }

  return (
    <div className="snip-page">
      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      {remoteChanged && (
        <div className="snip-remote-hint" onClick={() => setConfirmRefresh(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Remote update available — click to refresh
        </div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        onGetContent={getContent}
        onClear={() => setConfirmClear(true)}
        onSave={handleSave}
        onRefresh={() => setConfirmRefresh(true)}
        onCopyUrl={handleCopyUrl}
        onCopyContent={handleCopyContent}
        theme={theme}
        onThemeToggle={toggle}
      />

      <div className="snip-editor-wrap">
        <div ref={editorContainerRef} className="snip-editor" />
        <StatusBar content={getContent()} />
      </div>

      {confirmClear && (
        <ConfirmDialog
          message="This will erase all content in this snip. This cannot be undone."
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmRefresh && (
        <ConfirmDialog
          message="Reload the last saved version? Any unsaved changes will be lost."
          onConfirm={handleRefresh}
          onCancel={() => setConfirmRefresh(false)}
        />
      )}

      <Toast />
    </div>
  );
}
