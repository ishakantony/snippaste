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
import { useTheme } from "./themeContext.js";
import { useToast } from "./Toast.js";
import { getClientId } from "./clientId.js";
import * as snipStream from "./snipStream.js";

const lightTheme = EditorView.theme({
  "&": { background: "var(--ed-bg)", color: "var(--ed-fg)", height: "100%", fontSize: "13px" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  ".cm-content": { padding: "14px 20px" },
  ".cm-gutters": {
    background: "var(--gut-bg)",
    color: "var(--gut-fg)",
    border: "none",
    borderRight: "1px solid var(--top-bd)",
    width: "52px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    lineHeight: "22px",
    paddingTop: "14px",
  },
  ".cm-lineNumbers": { display: "flex", flexDirection: "column", alignItems: "flex-end", width: "52px" },
  ".cm-lineNumbers .cm-gutterElement": { paddingRight: "14px", paddingLeft: "0" },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-focused .cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-activeLineGutter": { background: "transparent" },
  ".cm-activeLine": { background: "transparent" },
});

const darkTheme = EditorView.theme({
  "&": { background: "var(--ed-bg) !important", color: "var(--ed-fg)", height: "100%", fontSize: "13px" },
  ".cm-scroller": { overflow: "auto", lineHeight: "22px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  ".cm-content": { padding: "14px 20px" },
  ".cm-gutters": {
    background: "var(--gut-bg) !important",
    color: "var(--gut-fg) !important",
    border: "none !important",
    borderRight: "1px solid var(--top-bd) !important",
    width: "52px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    lineHeight: "22px",
    paddingTop: "14px",
  },
  ".cm-lineNumbers": { display: "flex", flexDirection: "column", alignItems: "flex-end", width: "52px" },
  ".cm-lineNumbers .cm-gutterElement": { paddingRight: "14px", paddingLeft: "0" },
  ".cm-cursor": { borderLeftColor: "var(--accent) !important" },
  ".cm-activeLineGutter": { background: "transparent !important" },
  ".cm-activeLine": { background: "transparent" },
});

function buildExtensions(dark: boolean, updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  const themeExts = dark ? [oneDark, darkTheme] : [lightTheme];
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, ...themeExts];
}

type ConfirmAction = "clear" | "refresh" | null;

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";
  const { theme } = useTheme();
  const { show: showToast } = useToast();

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });
  const [contentSnapshot, setContentSnapshot] = useState("");
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  // Persists content across editor rebuilds (theme toggle) — Bug fix #2
  const latestContentRef = useRef("");
  // Set to true when we programmatically update the editor so onChange skips autosave — Bug fix #1
  const suppressOnChangeRef = useRef(false);

  // ── Autosave controller ────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AutosaveController({
      fetch: (url, init) => fetch(url, init),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      dateNow: () => Date.now(),
      url: `/api/snips/${encodeURIComponent(slug)}`,
      clientId: getClientId(),
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

  // ── Editor (rebuild on slug or theme change) ───────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const isDark = theme === "dark";

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressOnChangeRef.current) {
        const text = update.state.doc.toString();
        latestContentRef.current = text;
        setContentSnapshot(text);
        controllerRef.current?.onChange(text);
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        // Bug fix #2: read from latestContentRef, not from the (already-destroyed) editorViewRef
        doc: latestContentRef.current,
        extensions: buildExtensions(isDark, updateListener),
      }),
      parent: editorContainerRef.current,
    });

    // Destroy previous view first to avoid two editors in the DOM
    editorViewRef.current?.destroy();
    editorViewRef.current = view;

    return () => {
      // Save content before destroying, so the next render picks it up
      latestContentRef.current = view.state.doc.toString();
      view.destroy();
      if (editorViewRef.current === view) editorViewRef.current = null;
    };
  }, [slug, theme]);

  // ── Initial fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoadError(false);

    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ slug: string; content: string; updatedAt: number }>;
      })
      .then((data) => {
        if (data) applyContent(data.content);
      })
      .catch(() => {
        setLoadError(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── SSE real-time sync ─────────────────────────────────────────────────
  useEffect(() => {
    const myId = getClientId();

    const unsubStream = snipStream.subscribe(slug, {
      onSnapshot: () => {
        // Initial snapshot handled by REST fetch; snapshot here covers reconnects only
      },
      onUpdate: (update) => {
        if (update.clientId === myId) return; // self-echo: ignore

        const currentState = controllerRef.current?.getState();
        const isDirty = currentState?.status === "dirty" || currentState?.status === "saving";

        if (isDirty) {
          setRemoteChanged(true);
        } else {
          applyContent(update.content);
          setRemoteChanged(false);
        }
      },
    });

    return () => unsubStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── Helpers ────────────────────────────────────────────────────────────
  function applyContent(text: string) {
    latestContentRef.current = text;
    const view = editorViewRef.current;
    if (view) {
      suppressOnChangeRef.current = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
      suppressOnChangeRef.current = false;
    }
    setContentSnapshot(text);
  }

  function getContent(): string {
    return editorViewRef.current?.state.doc.toString() ?? "";
  }

  function handleClear() {
    applyContent("");
    // Don't autosave on clear — the confirm + explicit action is the save trigger
    controllerRef.current?.onChange("");
    setRemoteChanged(false);
  }

  function handleRefresh() {
    fetch(`/api/snips/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ content: string }>) : null))
      .then((data) => {
        if (data) applyContent(data.content);
        setRemoteChanged(false);
      })
      .catch(() => {});
  }

  function handleSave() {
    const controller = controllerRef.current;
    if (!controller) return;
    const state = controller.getState();
    if (state.status === "idle" || state.status === "saved") {
      showToast("Already saved");
      return;
    }
    controller.flush();
    const unsub = controller.subscribe((s) => {
      if (s.status === "saved") {
        showToast("Saved");
        unsub();
      } else if (s.status === "offline" || s.status === "too_large") {
        unsub();
      }
    });
  }

  // ── Confirm actions ────────────────────────────────────────────────────
  function handleConfirm() {
    if (confirmAction === "clear") handleClear();
    if (confirmAction === "refresh") handleRefresh();
    setConfirmAction(null);
  }

  const confirmMessages: Record<NonNullable<ConfirmAction>, string> = {
    clear: "This will erase all content in this snip. This cannot be undone.",
    refresh: "Reload the last saved version? Any unsaved changes will be lost.",
  };

  return (
    <div className="snip-page">
      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        onGetContent={getContent}
        onClear={() => setConfirmAction("clear")}
        onRefresh={() => setConfirmAction("refresh")}
        onSave={handleSave}
        remoteChanged={remoteChanged}
      />

      <div ref={editorContainerRef} className="snip-editor" />

      <StatusBar content={contentSnapshot} />

      {confirmAction && (
        <ConfirmDialog
          title="Are you sure?"
          message={confirmMessages[confirmAction]}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
