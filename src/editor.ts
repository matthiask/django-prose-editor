import "./editor.css"

import { Editor, type Extension } from "@tiptap/core"

export * from "@tiptap/core"
export { Blockquote } from "@tiptap/extension-blockquote"
export { Bold } from "@tiptap/extension-bold"
export { Code } from "@tiptap/extension-code"
export { CodeBlock } from "@tiptap/extension-code-block"
export { Color } from "@tiptap/extension-color"
export { Document } from "@tiptap/extension-document"
export { HardBreak } from "@tiptap/extension-hard-break"
export { Heading } from "@tiptap/extension-heading"
export { Highlight } from "@tiptap/extension-highlight"
// Import Figure extension
export { Image } from "@tiptap/extension-image"
export { Italic } from "@tiptap/extension-italic"
export { BulletList, ListItem } from "@tiptap/extension-list"
export { Paragraph } from "@tiptap/extension-paragraph"
export { Strike } from "@tiptap/extension-strike"
export { Subscript } from "@tiptap/extension-subscript"
export { Superscript } from "@tiptap/extension-superscript"
export { TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
export { Text } from "@tiptap/extension-text"
export { TextAlign } from "@tiptap/extension-text-align"
export { TextStyle } from "@tiptap/extension-text-style"
export { Underline } from "@tiptap/extension-underline"
export { Dropcursor, Gapcursor, TrailingNode } from "@tiptap/extensions"
export { Plugin } from "@tiptap/pm/state"
export { Caption, Figure } from "./figure"
export { Fullscreen } from "./fullscreen"
export * from "./history"
export { HorizontalRule } from "./horizontalRule"
export { HTML } from "./html"
export { Link } from "./link"
export * from "./menu"
export { NoSpellCheck } from "./nospellcheck"
// Import our custom OrderedList
export { OrderedList } from "./orderedList"
export * as pm from "./pm"
// export { Table } from "@tiptap/extension-table"
export { Table } from "./table"
export { Typographic } from "./typographic"
export * from "./utils"

import { crel } from "./utils"

type DjangoJQuery = (document: Document) => {
  on(event: string, callback: (e: any) => void): void
}

interface DjangoWindow extends Window {
  django?: {
    jQuery?: DjangoJQuery
  }
}

export function createTextareaEditor(
  textarea: HTMLTextAreaElement,
  extensions: Extension[],
): Editor {
  const disabled = textarea.hasAttribute("disabled")

  const element = crel("div", {
    className: `prose-editor ${disabled ? "disabled" : ""}`,
  })
  textarea.before(element)
  element.append(textarea)

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
      element.before(textarea)
      element.remove()
    },
  })

  return editor
}

export function initializeEditors(
  create: (el: HTMLElement) => void,
  selector: string,
): void {
  function initializeEditor(container: Document | HTMLElement): void {
    for (const el of container.querySelectorAll(selector)) {
      if (!(el as HTMLElement).id.includes("__prefix__")) {
        create(el as HTMLElement)
      }
    }
  }

  function initializeInlines(): void {
    const win = window as DjangoWindow
    let o: any
    if ((o = win.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e: any) => {
        initializeEditor(e.target)
      })
    }
  }

  initializeEditor(document)
  initializeInlines()
}
