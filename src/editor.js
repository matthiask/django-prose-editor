import "./editor.css"

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
// We're replacing the default OrderedList with our custom version below
// export { OrderedList } from "@tiptap/extension-ordered-list"
export { Strike } from "@tiptap/extension-strike"
export { Subscript } from "@tiptap/extension-subscript"
export { Superscript } from "@tiptap/extension-superscript"
export { Underline } from "@tiptap/extension-underline"

export { Code } from "@tiptap/extension-code"
export { CodeBlock } from "@tiptap/extension-code-block"

export { Color } from "@tiptap/extension-color"
export { Highlight } from "@tiptap/extension-highlight"
export { TextAlign } from "@tiptap/extension-text-align"
export { TextStyle } from "@tiptap/extension-text-style"

export { Table } from "@tiptap/extension-table"
export { TableCell } from "@tiptap/extension-table-cell"
export { TableHeader } from "@tiptap/extension-table-header"
export { TableRow } from "@tiptap/extension-table-row"

export { updateAttrsDialog } from "./commands.js"
export { HTML } from "./html.js"
export { Link } from "./link.js"
export { NoSpellCheck } from "./nospellcheck.js"
export { Typographic } from "./typographic.js"
export { Fullscreen } from "./fullscreen.js"
export { Plugin } from "@tiptap/pm/state"

export * from "./menu.js"
export * from "./utils.js"
export * from "@tiptap/core"

// Import our custom OrderedList
export { OrderedList } from "./orderedList.js"

import { crel } from "./utils.js"

export function createTextareaEditor(textarea, extensions) {
  const disabled = textarea.hasAttribute("disabled")

  const element = crel("div", {
    className: `prose-editor ${disabled ? "disabled" : ""}`,
  })
  textarea.before(element)

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
      element.remove()
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
