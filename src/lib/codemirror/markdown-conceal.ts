import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

class MarkdownMarkerWidget extends WidgetType {
  constructor(
    private readonly marker: string,
    private readonly className: string,
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = `cm-conceal-widget ${this.className}`.trim();
    span.textContent = this.marker;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

function markerRangeEnd(view: EditorView, to: number) {
  return view.state.sliceDoc(to, to + 1) === " " ? to + 1 : to;
}

function fenceMarkerText(lineText: string) {
  const match = lineText.match(/^\s*(`{3,}|~{3,})/);
  return match?.[1] ?? null;
}

function concealDecorations(view: EditorView) {
  const widgets: Range<Decoration>[] = [];
  const { state } = view;
  const tree = syntaxTree(state);

  tree.iterate({
    enter: (node) => {
      const { from, to, name } = node;

      if (name === "FencedCode") {
        const startLine = state.doc.lineAt(from);
        const endLine = state.doc.lineAt(to);

        for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber += 1) {
          const line = state.doc.line(lineNumber);
          const lineClasses = ["cm-line--code-block"];

          if (lineNumber === startLine.number) {
            lineClasses.push("cm-line--code-block-info");
          } else if (lineNumber === endLine.number) {
            lineClasses.push("cm-line--code-block-end");
          } else {
            lineClasses.push("cm-line--code-block-body");
          }

          widgets.push(
            Decoration.line({
              class: lineClasses.join(" "),
            }).range(line.from),
          );
        }
      }

      if (name === "HeaderMark") {
        if (state.sliceDoc(to, to + 1) !== " ") {
          return;
        }

        const level = state.sliceDoc(from, to).length;

        widgets.push(
          Decoration.replace({
            widget: new MarkdownMarkerWidget(
              String(level),
              "cm-conceal-widget--heading",
            ),
          }).range(from, markerRangeEnd(view, to)),
        );
        return;
      }

      if (name === "ListMark") {
        const markText = state.sliceDoc(from, to).trim();
        const orderedMatch = markText.match(/^(\d+)[.)]/);
        const isOrderedList = Boolean(orderedMatch);
        const marker = orderedMatch ? `${orderedMatch[1]}.` : "•";

        const line = state.doc.lineAt(from);
        widgets.push(
          Decoration.line({
            class: "cm-line--list",
          }).range(line.from),
        );

        widgets.push(
          Decoration.replace({
            widget: new MarkdownMarkerWidget(
              marker,
              `cm-conceal-widget--list ${
                isOrderedList
                  ? "cm-conceal-widget--ordered"
                  : "cm-conceal-widget--unordered"
              }`,
            ),
          }).range(from, markerRangeEnd(view, to)),
        );
        return;
      }

      if (name === "CodeMark") {
        const line = state.doc.lineAt(from);
        const marker = fenceMarkerText(line.text);

        if (!marker) {
          return;
        }

        const markText = state.sliceDoc(from, to);
        if (markText !== marker) {
          return;
        }

        widgets.push(
          Decoration.replace({}).range(from, to),
        );
      }

    },
  });

  return Decoration.set(widgets, true);
}

export function markdownConceal() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = concealDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = concealDecorations(update.view);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations,
    },
  );
}
