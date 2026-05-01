import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { AutosaveController, type AutosaveState } from "./autosaveController.js";
import { Toolbar } from "./Toolbar.js";

function isDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const baseEditorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.875rem", fontFamily: "'JetBrains Mono', 'Courier New', monospace" },
  ".cm-scroller": { overflow: "auto", lineHeight: "1.65" },
});

const lightTheme = EditorView.theme({
  "&": { background: "var(--bg)", color: "var(--fg)" },
  ".cm-gutters": {
    background: "var(--surface)",
    color: "var(--fg-muted)",
    border: "none",
    borderRight: "1px solid var(--border)",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-focused .cm-selectionBackground": { background: "var(--surface-2) !important" },
  ".cm-activeLineGutter": { background: "var(--surface-2)" },
  ".cm-activeLine": { background: "transparent" },
});

const darkOverride = EditorView.theme({
  "&": { background: "var(--bg) !important" },
  ".cm-gutters": {
    background: "var(--surface) !important",
    borderRight: "1px solid var(--border) !important",
    border: "none !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent) !important" },
  ".cm-activeLineGutter": { background: "var(--surface-2) !important" },
});

function buildExtensions(dark: boolean, updateListener: ReturnType<typeof EditorView.updateListener.of>) {
  const themeExts = dark ? [oneDark, darkOverride] : [lightTheme];
  return [lineNumbers(), EditorView.lineWrapping, keymap.of(defaultKeymap), updateListener, baseEditorTheme, ...themeExts];
}

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });

  const controllerRef = useRef<AutosaveController | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const controller = new AutosaveController({
      fetch: (url, init) => fetch(url, init),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      dateNow: () => Date.now(),
      url: `/api/snips/${encodeURIComponent(slug)}`,
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
      if (update.docChanged) {
        controllerRef.current?.onChange(update.state.doc.toString());
      }
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: buildExtensions(isDarkMode(), updateListener),
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleThemeChange() {
      const currentContent = view.state.doc.toString();
      view.destroy();
      editorViewRef.current = null;

      if (!editorContainerRef.current) return;

      const newView = new EditorView({
        state: EditorState.create({
          doc: currentContent,
          extensions: buildExtensions(isDarkMode(), updateListener),
        }),
        parent: editorContainerRef.current,
      });

      editorViewRef.current = newView;
    }

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
      const currentView = editorViewRef.current ?? view;
      currentView.destroy();
      editorViewRef.current = null;
    };
  }, [slug]);

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
          });
        }
      })
      .catch(() => {
        setLoadError(true);
      });
  }, [slug]);

  function getContent(): string {
    return editorViewRef.current?.state.doc.toString() ?? "";
  }

  function handleClear(): void {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
    });
    controllerRef.current?.onChange("");
  }

  return (
    <div className="snip-page">
      {loadError && (
        <div className="snip-load-error">load error — could not reach server</div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        onGetContent={getContent}
        onClear={handleClear}
      />

      <div ref={editorContainerRef} className="snip-editor" />
    </div>
  );
}
