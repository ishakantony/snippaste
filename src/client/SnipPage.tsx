import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { Toolbar } from "./Toolbar.js";
import { StatusBar } from "./StatusBar.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { getClientId } from "./clientId.js";
import { subscribeToSnip } from "./snipStream.js";
import { useTheme } from "./themeContext.js";
import { useToast } from "./Toast.js";

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", fontFamily: "var(--font-mono)" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px" },
  ".cm-content": { padding: "14px 0", caretColor: "var(--accent)" },
  ".cm-line": { padding: "0 20px" },
  ".cm-gutters": {
    width: "52px",
    background: "var(--editor-gutter)",
    color: "var(--muted)",
    border: "none",
    borderRight: "1px solid var(--border)",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
  },
  ".cm-lineNumbers .cm-gutterElement": { minWidth: "52px", padding: "0 14px 0 0", lineHeight: "22px" },
  ".cm-activeLineGutter": { background: "var(--editor-active)" },
  ".cm-activeLine": { background: "var(--editor-active)" },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground, .cm-focused .cm-selectionBackground": { background: "var(--selection) !important" },
});

const editorTheme = EditorView.theme({
  "&": { background: "var(--editor-bg)", color: "var(--fg)" },
});

function buildExtensions(updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, baseEditorTheme, editorTheme];
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [content, setContent] = useState("");
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [confirm, setConfirm] = useState<null | "clear" | "refresh">(null);

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const contentRef = useRef("");
  const suppressChangeRef = useRef(false);
  const saveStateRef = useRef<AutosaveState>({ status: "idle" });
  const clientIdRef = useRef(getClientId());

  function replaceEditorContent(next: string, notify = false): void {
    const view = editorViewRef.current;
    if (!view) return;
    suppressChangeRef.current = !notify;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    suppressChangeRef.current = false;
    contentRef.current = next;
    setContent(next);
  }

  async function fetchSnip(): Promise<void> {
    setLoadError(false);
    const res = await fetch(`/api/snips/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      replaceEditorContent("");
      setRemoteChanged(false);
      return;
    }
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json() as { content: string; updatedAt: number };
    replaceEditorContent(data.content);
    setRemoteChanged(false);
  }

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
      saveStateRef.current = state;
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
      if (!update.docChanged) return;
      const next = update.state.doc.toString();
      contentRef.current = next;
      setContent(next);
      if (!suppressChangeRef.current) {
        controllerRef.current?.onChange(next);
      }
    });

    const view = new EditorView({
      state: EditorState.create({ doc: contentRef.current, extensions: buildExtensions(updateListener) }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      if (editorViewRef.current === view) editorViewRef.current = null;
    };
  }, [slug, theme]);

  useEffect(() => {
    fetchSnip().catch(() => setLoadError(true));
  }, [slug]);

  useEffect(() => {
    const unsubscribe = subscribeToSnip(slug, {
      onSnapshot: (event) => {
        if (saveStateRef.current.status === "idle") replaceEditorContent(event.content);
      },
      onUpdate: (event) => {
        if (event.clientId === clientIdRef.current) return;
        const status = saveStateRef.current.status;
        if (status === "dirty" || status === "saving") {
          setRemoteChanged(true);
          return;
        }
        replaceEditorContent(event.content);
        setRemoteChanged(false);
      },
      onError: () => {},
    });
    return unsubscribe;
  }, [slug]);

  function handleClear(): void {
    setConfirm("clear");
  }

  function handleRefresh(): void {
    setConfirm("refresh");
  }

  async function handleSave(): Promise<void> {
    await controllerRef.current?.flush();
    showToast("Saved");
  }

  function handleConfirm(): void {
    const action = confirm;
    setConfirm(null);
    if (action === "clear") {
      replaceEditorContent("", true);
      controllerRef.current?.onChange("");
    }
    if (action === "refresh") {
      fetchSnip().catch(() => setLoadError(true));
    }
  }

  return (
    <div className="snip-page">
      {loadError && <div className="snip-load-error">load error: could not reach server</div>}

      <Toolbar
        slug={slug}
        saveState={saveState}
        remoteChanged={remoteChanged}
        onGetContent={() => contentRef.current}
        onClear={handleClear}
        onRefresh={handleRefresh}
        onSave={() => { void handleSave(); }}
        onToast={showToast}
      />

      <div ref={editorContainerRef} className="snip-editor" />
      <StatusBar content={content} />
      <ConfirmDialog
        open={confirm !== null}
        message={confirm === "clear" ? "Clear this snip? Everyone with the URL will see it as empty." : "Refresh from the server? Unsaved local text may be replaced."}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
