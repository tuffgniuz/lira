import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { useVimEditor } from "@/lib/hooks/use-vim-editor";
import { markdownConceal } from "@/lib/codemirror/markdown-conceal";
import {
  vimEditorCodeLanguages,
  vimEditorHighlightExtensions,
} from "@/lib/codemirror/vim-editor-markdown";

type VimEditorProps = {
  value: string;
  onChange: (value: string) => void;
  focusKey?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  showStatus?: boolean;
};

const vimEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--color-text-primary)",
    fontFamily: '"Recursive Variable", "IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: "1rem",
    fontWeight: "360",
    lineHeight: "1.7",
  },
  ".cm-editor": {
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
  },
  ".cm-content": {
    minHeight: "18rem",
    padding: "0",
    caretColor: "var(--color-text-primary)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-line--code-block": {
    padding: "0.15rem 0.9rem",
    margin: "0",
    background: "color-mix(in srgb, var(--color-surface-elevated) 88%, black 12%)",
    color: "var(--color-text-primary)",
    fontFamily: '"Recursive Variable", "JetBrains Mono", monospace',
    fontVariationSettings: '"MONO" 1, "CASL" 0.25',
    fontSize: "0.92rem",
    lineHeight: "1.65",
  },
  ".cm-line--code-block-info": {
    paddingTop: "0.75rem",
    paddingBottom: "0.35rem",
    color: "var(--color-text-secondary)",
    fontSize: "0.72rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  ".cm-line--code-block-body": {
    color: "var(--color-text-primary)",
  },
  ".cm-line--code-block-end": {
    paddingTop: "0.15rem",
    paddingBottom: "0.75rem",
    color: "var(--color-text-primary)",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-cursor, .cm-dropCursor": {
    backgroundColor: "var(--color-text-primary)",
    width: "2px",
  },
  ".cm-fat-cursor, .cm-fat-cursor-mark": {
    backgroundColor: "var(--color-text-primary)",
    color: "var(--color-main-bg)",
  },
  ".cm-header": {
    color: "var(--color-text-secondary)",
    letterSpacing: "0.01em",
  },
  ".cm-header-1": {
    color: "var(--color-accent)",
    fontWeight: 600,
  },
  ".cm-header-2": {
    color: "var(--color-accent-hover)",
    fontWeight: 600,
  },
  ".cm-header-3": {
    color: "var(--color-text-primary)",
    opacity: 0.8,
  },
  ".cm-link": {
    color: "var(--color-accent)",
    textDecoration: "underline",
    textDecorationColor: "color-mix(in srgb, var(--color-accent) 40%, transparent 60%)",
  },
  ".cm-link:hover": {
    color: "var(--color-accent-hover)",
  },
  ".cm-strong": {
    color: "var(--color-text-primary)",
    fontWeight: 600,
  },
  ".cm-emphasis": {
    color: "var(--color-text-muted)",
    fontStyle: "italic",
  },
  ".cm-formatting": {
    color: "var(--color-text-secondary)",
  },
  ".cm-formatting-link": {
    color: "var(--color-accent-hover)",
    fontWeight: 500,
  },
  ".cm-formatting-list": {
    color: "var(--color-accent-hover)",
    fontWeight: 600,
  },
  ".cm-list": {
    color: "var(--color-text-primary)",
  },
  ".cm-conceal-widget": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-conceal-widget--list": {
    minWidth: "1.15rem",
    color: "var(--color-accent-hover)",
    marginRight: "0.35rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  ".cm-conceal-widget--heading": {
    minWidth: "1.15rem",
    height: "1rem",
    padding: "0 0.32rem",
    marginRight: "0.45rem",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--color-accent) 16%, transparent 84%)",
    color: "var(--color-accent)",
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
    lineHeight: 1,
    verticalAlign: "baseline",
    transform: "translateY(-0.06em)",
  },
  ".cm-line--list": {
    paddingLeft: "0.35rem",
    marginLeft: "-0.35rem",
    borderRadius: "0.5rem",
    background: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent 45%)",
    border: "1px solid color-mix(in srgb, var(--color-panel-muted) 40%, transparent 60%)",
  },
  ".cm-line--quote": {
    padding: "0.55rem 0.9rem 0.55rem 1rem",
    margin: "0.45rem 0",
    background: "color-mix(in srgb, var(--color-surface-elevated) 82%, transparent 18%)",
    borderLeft: "2px solid var(--color-accent)",
    borderRadius: "0.35rem",
  },
  ".cm-line--hr": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem 0",
    "&::after": {
      content: '""',
      width: "100%",
      height: "1px",
      background: "var(--color-border-subtle)",
    },
  },
});

export function VimEditor({
  value,
  onChange,
  focusKey = "default",
  placeholder = "Start typing...",
  ariaLabel = "Text editor",
  className = "",
  showStatus = true,
}: VimEditorProps) {
  const { handleEditorCreate, handleEditorUpdate, vimMode } = useVimEditor(focusKey);

  const extensions = useMemo(
    () => [
      vim(),
      markdown({
        codeLanguages: vimEditorCodeLanguages,
      }),
      markdownConceal(),
      EditorView.lineWrapping,
      vimEditorTheme,
      ...vimEditorHighlightExtensions,
    ],
    [],
  );

  const wordCount = useMemo(() => {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [value]);

  return (
    <div className={`vim-editor ${className}`.trim()}>
      <CodeMirror
        value={value}
        aria-label={ariaLabel}
        className="vim-editor__surface"
        placeholder={placeholder}
        extensions={extensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          closeBrackets: false,
          allowMultipleSelections: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        onCreateEditor={handleEditorCreate}
        onUpdate={(update) => {
          handleEditorUpdate(update.view);
        }}
        onChange={onChange}
      />
      {showStatus ? (
        <div className="vim-editor__status" aria-label="Editor status">
          <span className="vim-editor__status-mode" data-mode={vimMode}>
            {vimMode.toUpperCase()}
          </span>
          <span className="vim-editor__status-counts">
            {wordCount}W {value.length}C
          </span>
        </div>
      ) : null}
    </div>
  );
}
