import "./overrides.css"
import "./editor.css"
import "prosemirror-view/style/prosemirror.css"

import { baseKeymap } from "prosemirror-commands"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"
// import { MenuItem, icons, menuBar } from "prosemirror-menu"
import { Schema } from "prosemirror-model"
import { nodes, marks } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"

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
    menuPlugin(
      blockTypeMenuItems(schema),
      [
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
  })
  const debouncedWriteBack = createDebouncedBackWriter(
    schema,
    editorViewInstance,
    textarea,
  )

  return () => {
    try {
      editorViewInstance.destroy()
    } catch (_err) {
      /* Intentionally left empty */
    }
    editor.remove()
  }
}
