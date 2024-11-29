import "./editor.css"

export * from "./library.js"

import {
  Editor,
  extensions,
  Blockquote,
  Bold,
  BulletList,
  Heading,
  HorizontalRule,
  Italic,
  ListItem,
  OrderedList,
  Strike,
  Subscript,
  Superscript,
  Underline,
  Link,
  Menu,
  NoSpellCheck,
  Typographic,
  crel,
} from "./library.js"

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
      ...extensions.base,
      /* Nodes and marks */
      isTypeEnabled("blockquote") && Blockquote,
      isTypeEnabled("strong") && Bold,
      isTypeEnabled("bullet_list") && BulletList,
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
