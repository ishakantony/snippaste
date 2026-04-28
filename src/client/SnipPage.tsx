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

export function SnipPage() {
  const { name } = useParams<{ name: string }>();
  const slug = name ?? "untitled";

  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "idle" });

  // Keep a stable ref to the controller so we can call onChange
  const controllerRef = useRef<AutosaveController | null>(null);

  // Ref to the container div that CodeMirror will attach to
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Ref to the EditorView so we can update content after load
  const editorViewRef = useRef<EditorView | null>(null);

  // Create / re-create the controller whenever the slug changes
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

  // Create the CodeMirror editor on mount / slug change
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        controllerRef.current?.onChange(update.state.doc.toString());
      }
    });

    const darkMode = isDarkMode();
    const themeExtensions = darkMode
      ? [oneDark]
      : [
          EditorView.theme({
            "&": { background: "var(--bg)", color: "var(--fg)" },
            ".cm-gutters": {
              background: "var(--toolbar-bg)",
              color: "var(--indicator-fg)",
              border: "none",
              borderRight: "1px solid var(--border)",
            },
          }),
        ];

    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [
          lineNumbers(),
          EditorView.lineWrapping,
          keymap.of(defaultKeymap),
          updateListener,
          EditorView.theme({
            "&": { height: "100%", fontSize: "1rem", fontFamily: "monospace" },
            ".cm-scroller": { overflow: "auto", lineHeight: "1.6" },
          }),
          ...themeExtensions,
        ],
      }),
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    // Listen for OS theme changes and recreate the editor if needed
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleThemeChange() {
      // Destroy and signal re-create by updating a state value isn't straightforward here.
      // Instead, we rebuild the entire view with updated extensions.
      const currentContent = view.state.doc.toString();
      view.destroy();
      editorViewRef.current = null;

      if (!editorContainerRef.current) return;

      const newDark = isDarkMode();
      const newThemeExtensions = newDark
        ? [oneDark]
        : [
            EditorView.theme({
              "&": { background: "var(--bg)", color: "var(--fg)" },
              ".cm-gutters": {
                background: "var(--toolbar-bg)",
                color: "var(--indicator-fg)",
                border: "none",
                borderRight: "1px solid var(--border)",
              },
            }),
          ];

      const newView = new EditorView({
        state: EditorState.create({
          doc: currentContent,
          extensions: [
            lineNumbers(),
            EditorView.lineWrapping,
            keymap.of(defaultKeymap),
            updateListener,
            EditorView.theme({
              "&": { height: "100%", fontSize: "1rem", fontFamily: "monospace" },
              ".cm-scroller": { overflow: "auto", lineHeight: "1.6" },
            }),
            ...newThemeExtensions,
          ],
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

  // Load content from the server on mount / slug change
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
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: data.content,
            },
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "sans-serif",
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      {loadError && (
        <div
          style={{
            padding: "0.25rem 0.75rem",
            background: "var(--load-error-bg)",
            borderBottom: "1px solid var(--load-error-border)",
            fontSize: "0.8rem",
            color: "var(--error-fg)",
            flexShrink: 0,
          }}
        >
          Load error
        </div>
      )}

      <Toolbar
        slug={slug}
        saveState={saveState}
        onGetContent={getContent}
        onClear={handleClear}
      />

      <div
        ref={editorContainerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      />
    </div>
  );
}
