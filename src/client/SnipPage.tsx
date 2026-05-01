import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { getClientId } from "./clientId.js";
import * as snipStream from "./snipStream.js";
import { Toolbar } from "./Toolbar.js";
import { StatusBar } from "./StatusBar.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { useToast } from "./Toast.js";
import { useTheme } from "./themeContext.js";

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px" },
});

const lightTheme = EditorView.theme({
  "&": { background: "var(--editor-ed-bg)", color: "var(--editor-fg)" },
  ".cm-gutters": {
    background: "var(--gutter-bg)",
    color: "var(--gutter-fg)",
    border: "none",
    borderRight: "1px solid var(--editor-top-bd)",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground": { background: "rgba(100,112,240,0.15) !important" },
  ".cm-focused .cm-selectionBackground": { background: "rgba(100,112,240,0.15) !important" },
  ".cm-activeLineGutter": { background: "rgba(100,112,240,0.06)" },
  ".cm-activeLine": { background: "transparent" },
});

const darkOverride = EditorView.theme({
  "&": { background: "var(--editor-ed-bg) !important" },
  ".cm-gutters": {
    background: "var(--gutter-bg) !important",
    borderRight: "1px solid var(--editor-top-bd) !important",
    border: "none !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent) !important" },
  ".cm-activeLineGutter": { background: "rgba(100,112,240,0.06) !important" },
});

function buildExtensions(dark: boolean, updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  const themeExts = dark ? [oneDark, darkOverride] : [lightTheme];
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, baseEditorTheme, ...themeExts];
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";
  const { theme } = useTheme();
  const { show } = useToast();

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [isDirty, setIsDirty] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number>(0);

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const clientId = useRef(getClientId());
  const isRemoteUpdateRef = useRef(false);
  const contentRef = useRef(""); // Track content separately from view
  const isDirtyRef = useRef(false);
  const saveStateRef = useRef<AutosaveState>({ status: "idle" });

  // Sync refs with state (for SSE callback)
  useEffect(() => {
    isDirtyRef.current = isDirty;
    saveStateRef.current = saveState;
  }, [isDirty, saveState]);

  // Initialize autosave controller
  useEffect(() => {
    const controller = new AutosaveController({
      fetch: (url, init) => fetch(url, init),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      dateNow: () => Date.now(),
      url: `/api/snips/${encodeURIComponent(slug)}`,
      clientId: clientId.current,
    });

    controllerRef.current = controller;

    const unsub = controller.subscribe((state) => {
      setSaveState(state);
      setIsDirty(state.status === "dirty" || state.status === "saving");
    });

    return () => {
      unsub();
      controllerRef.current = null;
    };
  }, [slug]);

  // Create/update CodeMirror editor — single effect for init + theme changes
  useEffect(() => {
    if (!editorContainerRef.current) return;

    // Preserve content before destroying
    const currentContent = contentRef.current;

    // Clean up any existing editor
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }
    editorContainerRef.current.innerHTML = "";

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        contentRef.current = text;
        if (!isRemoteUpdateRef.current) {
          controllerRef.current?.onChange(text);
        }
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: currentContent,
        extensions: buildExtensions(theme === "dark", updateListener),
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = "";
      }
    };
  }, [slug, theme]);

  // Fetch initial content
  useEffect(() => {
    setLoadError(false);
    contentRef.current = "";

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (data && editorViewRef.current) {
          const view = editorViewRef.current;
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
          });
          isRemoteUpdateRef.current = false;
          contentRef.current = data.content;
          setLastSavedAt(data.updatedAt);
        }
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [slug]);

  // Subscribe to SSE updates — ONLY depends on slug, uses refs for dirty state
  useEffect(() => {
    const unsub = snipStream.subscribe(slug, {
      onSnapshot: (snapshot) => {
        if (editorViewRef.current) {
          const view = editorViewRef.current;
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: snapshot.content },
          });
          isRemoteUpdateRef.current = false;
          contentRef.current = snapshot.content;
          setLastSavedAt(snapshot.updatedAt);
        }
      },
      onUpdate: (update) => {
        if (update.clientId === clientId.current) return; // ignore self-echo

        if (isDirtyRef.current || saveStateRef.current.status === "saving") {
          setRemoteChanged(true);
          return;
        }

        if (editorViewRef.current) {
          const view = editorViewRef.current;
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: update.content },
          });
          isRemoteUpdateRef.current = false;
          contentRef.current = update.content;
          setLastSavedAt(update.updatedAt);
        }
      },
      onError: () => {
        // Auto-reconnect handled by EventSource
      },
    });

    return () => {
      unsub();
    };
  }, [slug]); // ONLY slug — no isDirty or saveState!

  const getContent = useCallback((): string => {
    return contentRef.current;
  }, []);

  const handleClear = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
    });
    contentRef.current = "";
    controllerRef.current?.onChange("");
    setConfirmClear(false);
    show("Cleared");
  }, [show]);

  const handleRefresh = useCallback(() => {
    setConfirmRefresh(false);
    setRemoteChanged(false);

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (editorViewRef.current) {
          const view = editorViewRef.current;
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
          });
          isRemoteUpdateRef.current = false;
          contentRef.current = data.content;
          setLastSavedAt(data.updatedAt);
        }
        show("Refreshed");
      })
      .catch(() => {
        show("Refresh failed");
      });
  }, [slug, show]);

  const handleSave = useCallback(() => {
    controllerRef.current?.flush();
    show("Saved");
  }, [show]);

  const handleCopyUrl = useCallback(() => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    show("URL copied");
  }, [slug, show]);

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(getContent()).catch(() => {});
    show("Copied");
  }, [getContent, show]);

  const handleApplyRemote = useCallback(() => {
    setConfirmRefresh(true);
  }, []);

  return (
    <div className="snip-page">
      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        isDirty={isDirty}
        onClear={() => setConfirmClear(true)}
        onRefresh={() => setConfirmRefresh(true)}
        onSave={handleSave}
        onCopyUrl={handleCopyUrl}
        onCopyContent={handleCopyContent}
        remoteChanged={remoteChanged}
        onApplyRemote={handleApplyRemote}
      />

      <div ref={editorContainerRef} className="snip-editor" />

      <StatusBar content={getContent()} />

      <ConfirmDialog
        open={confirmClear}
        message="Clear this snip? Everyone with the URL will see it as empty."
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmRefresh}
        message="Refresh from server? This will overwrite your current content."
        onConfirm={handleRefresh}
        onCancel={() => setConfirmRefresh(false)}
      />
    </div>
  );
}
