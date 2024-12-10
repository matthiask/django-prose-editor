// All these classes and utilities are available on window.DjangoProseEditor

import { Editor } from "@tiptap/core"
export { Document } from "@tiptap/extension-document"
export { Dropcursor } from "@tiptap/extension-dropcursor"
export { Gapcursor } from "@tiptap/extension-gapcursor"
export { History } from "@tiptap/extension-history"
export { Paragraph } from "@tiptap/extension-paragraph"
export { HardBreak } from "@tiptap/extension-hard-break"
export { Text } from "@tiptap/extension-text"

export { Blockquote } from "@tiptap/extension-blockquote"
export { Bold } from "@tiptap/extension-bold"
export { BulletList } from "@tiptap/extension-bullet-list"
export { Heading } from "@tiptap/extension-heading"
export { HorizontalRule } from "@tiptap/extension-horizontal-rule"
export { Italic } from "@tiptap/extension-italic"
export { ListItem } from "@tiptap/extension-list-item"
export { OrderedList } from "@tiptap/extension-ordered-list"
export { Strike } from "@tiptap/extension-strike"
export { Subscript } from "@tiptap/extension-subscript"
export { Superscript } from "@tiptap/extension-superscript"
export { Underline } from "@tiptap/extension-underline"

export { Code } from "@tiptap/extension-code"
export { CodeBlock } from "@tiptap/extension-code-block"
export { TextAlign } from "@tiptap/extension-text-align"
export { Table } from "@tiptap/extension-table"
export { TableCell } from "@tiptap/extension-table-cell"
export { TableHeader } from "@tiptap/extension-table-header"
export { TableRow } from "@tiptap/extension-table-row"

export { updateAttrsDialog } from "./commands.js"
export { HTML } from "./html.js"
export { Link } from "./link.js"
export { NoSpellCheck } from "./nospellcheck.js"
export { Typographic } from "./typographic.js"
export { Plugin } from "@tiptap/pm/state"

export * from "./menu.js"
export * from "./utils.js"
export * from "@tiptap/core"

import { crel, settings } from "./utils.js"

export function createTextareaEditor(
  textarea,
  extensions,
  { shadow = false } = {},
) {
  const disabled = textarea.hasAttribute("disabled")

  const wrap = crel("div", { className: "prose-editor-wrapper" })
  textarea.before(wrap)

  const element = crel("div", {
    className: `prose-editor ${disabled ? "disabled" : ""}`,
  })

  if (shadow) {
    const shadowElement = wrap.attachShadow({ mode: "open" })
    for (const href of settings().stylesheets) {
      shadowElement.append(
        crel("link", {
          rel: "stylesheet",
          href,
        }),
      )
    }

    shadowElement.append(element)
  } else {
    wrap.append(element)
  }

  const editor = new Editor({
    element,
    editable: !disabled,
    extensions,
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML()
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    },
    onDestroy() {
      wrap.remove()
    },
  })

  return editor
}

export function initializeEditors(create, selector) {
  function initializeEditor(container) {
    for (const el of container.querySelectorAll(selector)) {
      if (!el.id.includes("__prefix__")) {
        create(el)
      }
    }
  }

  function initializeInlines() {
    let o
    if ((o = window.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e) => {
        initializeEditor(e.target)
      })
    }
  }

  initializeEditor(document)
  initializeInlines()
}
