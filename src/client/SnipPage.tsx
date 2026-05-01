import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { Toolbar } from "./Toolbar.js";
import { StatusBar } from "./StatusBar.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { showToast } from "./Toast.js";
import { getClientId } from "./clientId.js";
import { subscribeSnipStream } from "./snipStream.js";
import { useTheme } from "./themeContext.js";

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.8125rem", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px" },
});

const lightTheme = EditorView.theme({
  "&": { background: "#FAFBFD", color: "#1A2236" },
  ".cm-gutters": {
    background: "#F4F6FA",
    color: "#B0BAD0",
    border: "none",
    borderRight: "1px solid #DDE3EE",
  },
  ".cm-cursor": { borderLeftColor: "#6470F0" },
  ".cm-selectionBackground": { background: "#DDE3EE !important" },
  ".cm-focused .cm-selectionBackground": { background: "#DDE3EE !important" },
  ".cm-activeLineGutter": { background: "#DDE3EE" },
  ".cm-activeLine": { background: "transparent" },
});

const darkThemeOverride = EditorView.theme({
  "&": { background: "#08090F !important" },
  ".cm-gutters": {
    background: "#0D1117 !important",
    borderRight: "1px solid #1A2234 !important",
    border: "none !important",
  },
  ".cm-cursor": { borderLeftColor: "#6470F0 !important" },
  ".cm-activeLineGutter": { background: "#131922 !important" },
});

function buildExtensions(dark: boolean, updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  const themeExts = dark ? [oneDark, darkThemeOverride] : [lightTheme];
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, baseEditorTheme, ...themeExts];
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [confirmAction, setConfirmAction] = useState<"clear" | "refresh" | null>(null);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [editorContent, setEditorContent] = useState("");

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const clientIdRef = useRef(getClientId());
  const isRemoteUpdateRef = useRef(false);
  const preservedContentRef = useRef("");
  const { theme } = useTheme();

  const isDirty = saveState.status === "dirty" || saveState.status === "saving";

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

    const unsub = controller.subscribe((state) => {
      setSaveState(state);
    });

    return () => {
      unsub();
      controllerRef.current = null;
    };
  }, [slug]);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isRemoteUpdateRef.current) {
        controllerRef.current?.onChange(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: preservedContentRef.current,
        extensions: buildExtensions(theme === "dark", updateListener),
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      preservedContentRef.current = view.state.doc.toString();
      view.destroy();
      editorViewRef.current = null;
    };
  }, [slug, theme]);

  useEffect(() => {
    preservedContentRef.current = "";
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
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
          });
          isRemoteUpdateRef.current = false;
          setEditorContent(data.content);
        }
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [slug]);

  useEffect(() => {
    const unsub = subscribeSnipStream(slug, {
      onSnapshot: () => {},
      onUpdate: (data) => {
        if (data.clientId === clientIdRef.current) return;

        const view = editorViewRef.current;
        if (!view) return;

        const state = controllerRef.current?.getState();
        if (state?.status === "dirty" || state?.status === "saving") {
          setRemoteChanged(true);
          return;
        }

        isRemoteUpdateRef.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: data.content },
        });
        isRemoteUpdateRef.current = false;
        setEditorContent(data.content);
      },
      onError: () => {},
    });

    return unsub;
  }, [slug]);

  useEffect(() => {
    const iv = setInterval(() => {
      const content = editorViewRef.current?.state.doc.toString() ?? "";
      setEditorContent(content);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  function getContent(): string {
    return editorViewRef.current?.state.doc.toString() ?? "";
  }

  function handleClear(): void {
    setConfirmAction("clear");
  }

  function handleRefresh(): void {
    setConfirmAction("refresh");
  }

  function handleConfirmClear(): void {
    setConfirmAction(null);
    const view = editorViewRef.current;
    if (!view) return;
    isRemoteUpdateRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
    });
    isRemoteUpdateRef.current = false;
    controllerRef.current?.onChange("");
    setEditorContent("");
  }

  function handleConfirmRefresh(): void {
    setConfirmAction(null);
    setRemoteChanged(false);
    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ content: string }>;
      })
      .then((data) => {
        if (editorViewRef.current) {
          isRemoteUpdateRef.current = true;
          editorViewRef.current.dispatch({
            changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: data.content },
          });
          isRemoteUpdateRef.current = false;
          setEditorContent(data.content);
        }
      })
      .catch(() => {
        setLoadError(true);
      });
  }

  const handleSave = useCallback(() => {
    const state = controllerRef.current?.getState();
    if (state?.status === "dirty" || state?.status === "offline" || state?.status === "too_large") {
      controllerRef.current?.flush();
    }
    showToast("Saved");
  }, []);

  return (
    <div className="snip-page">
      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        dirty={isDirty}
        onGetContent={getContent}
        onClear={handleClear}
        onRefresh={handleRefresh}
        onSave={handleSave}
      />

      <div ref={editorContainerRef} className="snip-editor" />

      <StatusBar content={editorContent} />

      {remoteChanged && (
        <span className="remote-hint">Remote update available — Refresh to apply</span>
      )}

      {confirmAction === "clear" && (
        <ConfirmDialog
          title="Are you sure?"
          message="This will erase all content in this snip. This cannot be undone."
          confirmLabel="Clear"
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === "refresh" && (
        <ConfirmDialog
          title="Are you sure?"
          message="Reload the last saved version? Any unsaved changes will be lost."
          confirmLabel="Refresh"
          onConfirm={handleConfirmRefresh}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
