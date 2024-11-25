import "./editor.css"

import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import Link from "@tiptap/extension-link"

import { addLink } from "./commands.js"
import { Menu } from "./menu.js"
import { NoSpellCheck } from "./nospellcheck.js"
import { Typographic } from "./typographic.js"
import { crel } from "./utils.js"

const LinkWithShortcut = Link.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        console.debug("editor", editor)
        addLink(editor.view.state, editor.view.dispatch)
      },
    }
  },
})

export function createEditor(textarea, config) {
  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const editorInstance = new Editor({
    element: editor,
    editable: !textarea.hasAttribute("disabled"),
    extensions: [
      StarterKit,
      Menu.configure({ config }),
      NoSpellCheck,
      Subscript,
      Superscript,
      LinkWithShortcut.configure({
        openOnClick: false,
      }),
      config.typographic ? Typographic : null,
    ].filter(Boolean),
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML()
    },
    onDestroy() {
      editor.replaceWith(textarea)
    },
  })

  return () => {
    editorInstance.destroy()
  }
}
