import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { markdownConceal } from "./markdown-conceal";
import {
  vimEditorCodeLanguages,
  vimEditorHighlightExtensions,
} from "./vim-editor-markdown";

const mountedViews: EditorView[] = [];

function renderMarkdown(doc: string) {
  const parent = document.createElement("div");
  document.body.append(parent);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdown(), markdownConceal()],
      selection: { anchor: doc.length },
    }),
    parent,
  });

  mountedViews.push(view);
  return { parent, view };
}

function renderMarkdownWithCodeLanguages(doc: string) {
  const parent = document.createElement("div");
  document.body.append(parent);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        markdown({
          codeLanguages: vimEditorCodeLanguages,
        }),
        ...vimEditorHighlightExtensions,
        markdownConceal(),
      ],
      selection: { anchor: doc.length },
    }),
    parent,
  });

  mountedViews.push(view);
  return { parent, view };
}

describe("markdownConceal plugin", () => {
  afterEach(() => {
    while (mountedViews.length > 0) {
      mountedViews.pop()?.destroy();
    }

    document.body.innerHTML = "";
  });

  it("loads the plugin entrypoint", async () => {
    const module = await import("./markdown-conceal");

    expect(module.markdownConceal).toBeDefined();
  });

  it("conceals completed heading markers into a compact level badge and renders list markers through widgets", () => {
    const { parent } = renderMarkdown("### Hello\n\n- item\n1. num\n ");
    const lines = Array.from(parent.querySelectorAll(".cm-line"));
    const headingBadge = parent.querySelector(".cm-conceal-widget--heading");
    const listWidgets = Array.from(parent.querySelectorAll(".cm-conceal-widget--list"));

    expect(lines[0]?.textContent).toContain("Hello");
    expect(lines[0]?.innerHTML).not.toContain("###");
    expect(headingBadge?.textContent).toBe("3");
    expect(listWidgets).toHaveLength(2);
    expect(listWidgets[0]?.textContent).toBe("•");
    expect(listWidgets[1]?.textContent).toBe("1.");
  });

  it("keeps heading markers visible until a space completes the markdown heading marker", () => {
    const incomplete = renderMarkdown("##\n ");
    const completed = renderMarkdown("## Hello\n ");

    const incompleteLine = incomplete.parent.querySelector(".cm-line");
    const completedLine = completed.parent.querySelector(".cm-line");
    const completedHeadingBadge = completed.parent.querySelector(".cm-conceal-widget--heading");

    expect(incompleteLine?.textContent).toBe("##");
    expect(completedLine?.textContent).toContain("Hello");
    expect(completedLine?.innerHTML).not.toContain("##");
    expect(completedHeadingBadge?.textContent).toBe("2");
  });

  it("conceals fenced code markers while keeping the language info visible", () => {
    const { parent } = renderMarkdown("```rs\nfn main() {\n}\n```\n ");
    const lines = Array.from(parent.querySelectorAll(".cm-line"));

    expect(lines[0]?.textContent).toBe("rs");
    expect(lines[0]?.innerHTML).not.toContain("```");
    expect(lines[3]?.textContent).toBe("");
  });

  it("conceals bold and italic markers", () => {
    const { parent } = renderMarkdown("**bold** and *italic*\n ");
    const line = parent.querySelector(".cm-line");

    expect(line?.textContent).toBe("bold and italic");
    expect(line?.innerHTML).not.toContain("**");
    expect(line?.innerHTML).not.toContain("*");
  });

  it("conceals blockquote markers into a dedicated quote surface", () => {
    const { parent } = renderMarkdown("> quoted text\n ");
    const line = parent.querySelector(".cm-line");
    const quoteWidget = parent.querySelector(".cm-conceal-widget--quote");

    expect(line?.className).toContain("cm-line--quote");
    expect(line?.textContent).toBe("quoted text");
    expect(quoteWidget).toBeNull();
  });

  it("conceals horizontal rules and applies a dedicated line class", () => {
    const { parent } = renderMarkdown("---\n ");
    const line = parent.querySelector(".cm-line");

    expect(line?.className).toContain("cm-line--hr");
    expect(line?.textContent).toBe("");
  });

  it("marks fenced code blocks as dedicated editor surfaces", () => {
    const { parent } = renderMarkdown("```rs\nfn main() {\n}\n```");
    const lines = Array.from(parent.querySelectorAll(".cm-line"));

    expect(lines[0]?.className).toContain("cm-line--code-block");
    expect(lines[0]?.className).toContain("cm-line--code-block-info");
    expect(lines[1]?.className).toContain("cm-line--code-block");
    expect(lines[1]?.className).toContain("cm-line--code-block-body");
    expect(lines[3]?.className).toContain("cm-line--code-block");
    expect(lines[3]?.className).toContain("cm-line--code-block-end");
  });

  it("applies fenced rust syntax highlighting inside code blocks", () => {
    const { parent } = renderMarkdownWithCodeLanguages("```rs\nfn main() {\n}\n```");
    const codeLines = Array.from(parent.querySelectorAll(".cm-line--code-block-body"));
    const keywordToken = Array.from(codeLines[0]?.querySelectorAll("span") ?? []).find(
      (node) => node.textContent === "fn",
    );

    expect(keywordToken).toBeDefined();
  });

  it("applies fenced typescript syntax highlighting inside code blocks", () => {
    const { parent } = renderMarkdownWithCodeLanguages("```ts\nconst value: string = 'ok';\n```");
    const codeLines = Array.from(parent.querySelectorAll(".cm-line--code-block-body"));
    const keywordToken = Array.from(codeLines[0]?.querySelectorAll("span") ?? []).find(
      (node) => node.textContent === "const",
    );

    expect(keywordToken).toBeDefined();
  });

  it("applies fenced python syntax highlighting inside code blocks", () => {
    const { parent } = renderMarkdownWithCodeLanguages("```py\ndef greet():\n    return 'hi'\n```");
    const codeLines = Array.from(parent.querySelectorAll(".cm-line--code-block-body"));
    const keywordToken = Array.from(codeLines[0]?.querySelectorAll("span") ?? []).find(
      (node) => node.textContent === "def",
    );

    expect(keywordToken).toBeDefined();
  });
});
