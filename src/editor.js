import "./editor.css"

import { Editor } from "@tiptap/core"
import { Document } from "@tiptap/extension-document"
import { Dropcursor } from "@tiptap/extension-dropcursor"
import { Gapcursor } from "@tiptap/extension-gapcursor"
import { History } from "@tiptap/extension-history"
import { Paragraph } from "@tiptap/extension-paragraph"
import { Text } from "@tiptap/extension-text"

import { Blockquote } from "@tiptap/extension-blockquote"
import { Bold } from "@tiptap/extension-bold"
import { BulletList } from "@tiptap/extension-bullet-list"
import { HardBreak } from "@tiptap/extension-hard-break"
import { Heading } from "@tiptap/extension-heading"
import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { Italic } from "@tiptap/extension-italic"
import { ListItem } from "@tiptap/extension-list-item"
import { OrderedList } from "@tiptap/extension-ordered-list"
import { Strike } from "@tiptap/extension-strike"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Underline } from "@tiptap/extension-underline"

import { Link } from "./link.js"
import { Menu } from "./menu.js"
import { NoSpellCheck } from "./nospellcheck.js"
import { Typographic } from "./typographic.js"
import { crel } from "./utils.js"

const createIsTypeEnabled = (types) => (type) =>
  types?.length ? types.includes(type) : true

export { Extension } from "@tiptap/core"
export { Plugin } from "@tiptap/pm/state"

export function createEditor(textarea, config) {
  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const isTypeEnabled = createIsTypeEnabled(config.types)

  const editorInstance = new Editor({
    element: editor,
    editable: !textarea.hasAttribute("disabled"),
    extensions: [
      Document,
      Dropcursor,
      Gapcursor,
      config.history && History,
      Paragraph,
      Text,
      /* Nodes and marks */
      isTypeEnabled("blockquote") && Blockquote,
      isTypeEnabled("strong") && Bold,
      isTypeEnabled("bullet_list") && BulletList,
      isTypeEnabled("hard_break") && HardBreak,
      isTypeEnabled("heading") && Heading,
      isTypeEnabled("horizontal_rule") && HorizontalRule,
      isTypeEnabled("em") && Italic,
      isTypeEnabled("link") &&
        Link.configure({
          openOnClick: false,
        }),
      (isTypeEnabled("bullet_list") || isTypeEnabled("ordered_list")) &&
        ListItem,
      isTypeEnabled("ordered_list") && OrderedList,
      isTypeEnabled("strikethrough") && Strike,
      isTypeEnabled("sub") && Subscript,
      isTypeEnabled("sup") && Superscript,
      isTypeEnabled("underline") && Underline,
      /* Other extensions */
      Menu.configure({ config }),
      NoSpellCheck,
      config.typographic ? Typographic : null,
    ].filter(Boolean),
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML()
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    },
    onDestroy() {
      editor.replaceWith(textarea)
    },
  })

  return () => {
    editorInstance.destroy()
  }
}
