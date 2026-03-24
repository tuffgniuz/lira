import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { tags } from "@lezer/highlight";
import { shell } from "@codemirror/legacy-modes/mode/shell";

export const vimEditorCodeLanguages = [
  LanguageDescription.of({
    name: "Rust",
    alias: ["rust", "rs"],
    support: rust(),
  }),
  LanguageDescription.of({
    name: "JavaScript",
    alias: ["javascript", "js", "node", "nodejs", "jsx"],
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: "TypeScript",
    alias: ["typescript", "ts", "tsx"],
    support: javascript({ typescript: true, jsx: true }),
  }),
  LanguageDescription.of({
    name: "Python",
    alias: ["python", "py"],
    support: python(),
  }),
  LanguageDescription.of({
    name: "Shell",
    alias: ["bash", "sh", "shell", "zsh"],
    support: new LanguageSupport(StreamLanguage.define(shell)),
  }),
  LanguageDescription.of({
    name: "HTML",
    alias: ["html"],
    support: html(),
  }),
  LanguageDescription.of({
    name: "CSS",
    alias: ["css"],
    support: css(),
  }),
  LanguageDescription.of({
    name: "SQL",
    alias: ["sql", "sqlite", "postgres", "postgresql", "mysql"],
    support: sql(),
  }),
  LanguageDescription.of({
    name: "YAML",
    alias: ["yaml", "yml"],
    support: yaml(),
  }),
  LanguageDescription.of({
    name: "Markdown",
    alias: ["markdown", "md"],
    support: markdown(),
  }),
];

export const vimEditorHighlightExtensions = [
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: tags.meta,
        color: "var(--color-accent-hover)",
        fontWeight: "600",
      },
      {
        tag: tags.heading,
        color: "var(--color-accent)",
        fontWeight: "700",
      },
      {
        tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.modifier],
        color: "var(--color-accent)",
        fontWeight: "600",
      },
      {
        tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape],
        color: "var(--color-warning)",
      },
      {
        tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom],
        color: "var(--color-accent-hover)",
      },
      {
        tag: [tags.typeName, tags.className, tags.namespace, tags.macroName],
        color: "var(--color-text-primary)",
        fontWeight: "600",
      },
      {
        tag: [tags.propertyName, tags.attributeName, tags.labelName],
        color: "var(--color-text-primary)",
      },
      {
        tag: [tags.variableName, tags.special(tags.variableName), tags.self],
        color: "var(--color-text-muted)",
      },
      {
        tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
        color: "var(--color-text-primary)",
        fontWeight: "600",
      },
      {
        tag: [tags.operator, tags.punctuation, tags.separator, tags.paren, tags.squareBracket, tags.brace],
        color: "var(--color-text-secondary)",
      },
      {
        tag: [tags.comment, tags.lineComment, tags.blockComment],
        color: "var(--color-text-secondary)",
        fontStyle: "italic",
      },
    ]),
  ),
];
