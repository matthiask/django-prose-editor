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

export function createEditor(textarea, _config) {
  const _editable = !textarea.hasAttribute("disabled")

  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const _editorInstance = new Editor({
    element: editor,
    extensions: [
      StarterKit,
      Menu,
      NoSpellCheck,
      Subscript,
      Superscript,
      LinkWithShortcut.configure({
        openOnClick: false,
      }),
      Typographic,
    ],
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML()
    },
    onDestroy() {
      editor.replaceWith(textarea)
    },
  })
}

/*
import "prosemirror-view/style/prosemirror.css"

import { baseKeymap } from "@tiptap/pm/commands"
import { dropCursor } from "@tiptap/pm/dropcursor"
import { gapCursor } from "@tiptap/pm/gapcursor"
import { history } from "@tiptap/pm/history"
import { keymap } from "@tiptap/pm/keymap"
// import { MenuItem, icons, menuBar } from "@tiptap/pm/menu"
import { Schema } from "@tiptap/pm/model"
import { nodes, marks } from "@tiptap/pm/schema-basic"
import { addListNodes } from "@tiptap/pm/schema-list"
import { EditorState } from "@tiptap/pm/state"
import { EditorView } from "@tiptap/pm/view"

import { buildKeymap, applyMarksKeymap } from "./keymap.js"
import {
  menuPlugin,
  blockTypeMenuItems,
  listMenuItems,
  linkMenuItems,
  historyMenuItems,
  markMenuItems,
  htmlMenuItem,
} from "./menu.js"
import { noSpellCheck } from "./nospellcheck.js"
import { typographicPlugin } from "./typographic.js"
import { crel, createDebouncedBackWriter, parseHTML } from "./utils.js"

const underlineDOM = ["u", 0]
const strikethroughDOM = ["s", 0]
const subDOM = ["sub", 0]
const supDOM = ["sup", 0]

const pruneSchema = (schema, types = null) => {
  if (!types) return schema

  const allow = ["doc", "paragraph", "text", ...types]
  const nodes = {}
  const marks = {}
  schema.spec.nodes.forEach((key, value) => {
    if (allow.includes(key)) nodes[key] = value
  })
  schema.spec.marks.forEach((key, value) => {
    if (allow.includes(key)) marks[key] = value
  })
  return new Schema({ nodes, marks })
}

export function createEditor(textarea, config) {
  const editable = !textarea.hasAttribute("disabled")

  const schemaSpec = {
    nodes: {
      doc: nodes.doc,
      paragraph: nodes.paragraph,
      heading: nodes.heading,
      blockquote: nodes.blockquote,
      horizontal_rule: nodes.horizontal_rule,
      text: nodes.text,
      hard_break: nodes.hard_break,
    },
    marks: {
      link: marks.link,
      strong: marks.strong,
      em: marks.em,
      underline: {
        parseDOM: [{ tag: "u" }, { style: "text-decoration:underline" }],
        toDOM() {
          return underlineDOM
        },
      },
      strikethrough: {
        parseDOM: [{ tag: "s" }, { style: "text-decoration:line-through" }],
        toDOM() {
          return strikethroughDOM
        },
      },
      sub: {
        parseDOM: [{ tag: "sub" }],
        toDOM() {
          return subDOM
        },
      },
      sup: {
        parseDOM: [{ tag: "sup" }],
        toDOM() {
          return supDOM
        },
      },
    },
  }

  let schema = new Schema(schemaSpec)
  schema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks,
  })
  schema = pruneSchema(schema, config.types)

  const ourKeymap = {
    ...buildKeymap(schema),
    ...applyMarksKeymap(schema),
  }

  const plugins = [
    keymap(ourKeymap),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor(),
    history(),
    editable &&
      menuPlugin(
        [
          blockTypeMenuItems(schema, config.headingLevels),
          listMenuItems(schema),
          linkMenuItems(schema),
          markMenuItems(schema),
          config.history ? historyMenuItems() : null,
          config.html ? htmlMenuItem() : null,
        ].filter(Boolean),
      ),
    noSpellCheck(),
    config.typographic ? typographicPlugin : null,
  ].filter(Boolean)

  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const editorViewInstance = new EditorView(editor, {
    state: EditorState.create({
      doc: parseHTML(schema, textarea.value),
      plugins,
    }),

    dispatchTransaction: (tr) => {
      editorViewInstance.updateState(editorViewInstance.state.apply(tr))
      debouncedWriteBack()
    },

    editable(_state) {
      return editable
    },
  })

  const debouncedWriteBack = createDebouncedBackWriter(
    schema,
    editorViewInstance,
    textarea,
  )

  return () => {
    editor.before(textarea)
    try {
      editorViewInstance.destroy()
    } catch (_err) {
      // Intentionally left empty
    }
    editor.remove()
  }
}
*/
