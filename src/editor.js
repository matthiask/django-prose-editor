import "./editor.css"

import { Editor } from "@tiptap/core"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Link as BaseLink } from "@tiptap/extension-link"

import { Blockquote } from "@tiptap/extension-blockquote"
import { Bold } from "@tiptap/extension-bold"
import { BulletList } from "@tiptap/extension-bullet-list"
import { Document } from "@tiptap/extension-document"
import { Dropcursor } from "@tiptap/extension-dropcursor"
import { Gapcursor } from "@tiptap/extension-gapcursor"
import { HardBreak } from "@tiptap/extension-hard-break"
import { Heading } from "@tiptap/extension-heading"
import { History } from "@tiptap/extension-history"
import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { Italic } from "@tiptap/extension-italic"
import { ListItem } from "@tiptap/extension-list-item"
import { OrderedList } from "@tiptap/extension-ordered-list"
import { Paragraph } from "@tiptap/extension-paragraph"
import { Strike } from "@tiptap/extension-strike"
import { Text } from "@tiptap/extension-text"

import { addLink } from "./commands.js"
import { Menu } from "./menu.js"
import { NoSpellCheck } from "./nospellcheck.js"
import { Typographic } from "./typographic.js"
import { crel } from "./utils.js"

const Link = BaseLink.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        console.debug("editor", editor)
        addLink(editor.view.state, editor.view.dispatch)
      },
    }
  },
})

const createIsTypeEnabled = (types) => (type) =>
  types?.length ? types.includes(type) : true

export function createEditor(textarea, config) {
  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const isTypeEnabled = createIsTypeEnabled(config.types)

  const editorInstance = new Editor({
    element: editor,
    editable: !textarea.hasAttribute("disabled"),
    extensions: [
      isTypeEnabled("blockquote") && Blockquote,
      isTypeEnabled("strong") && Bold,
      isTypeEnabled("bullet_list") && BulletList,
      Document,
      Dropcursor,
      Gapcursor,
      isTypeEnabled("hard_break") && HardBreak,
      isTypeEnabled("heading") && Heading,
      config.history && History,
      isTypeEnabled("horizontal_rule") && HorizontalRule,
      isTypeEnabled("em") && Italic,
      ListItem,
      isTypeEnabled("ordered_list") && OrderedList,
      Paragraph,
      isTypeEnabled("strikethrough") && Strike,
      Text,
      Menu.configure({ config }),
      NoSpellCheck,
      isTypeEnabled("sub") && Subscript,
      isTypeEnabled("sup") && Superscript,
      isTypeEnabled("link") &&
        Link.configure({
          openOnClick: false,
        }),
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
