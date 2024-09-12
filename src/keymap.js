import {
  chainCommands,
  toggleMark,
  exitCode,
  wrapIn,
} from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { undoInputRule } from "prosemirror-inputrules"
import {
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from "prosemirror-schema-list"

import { addLink } from "./commands.js"

const mac =
  typeof navigator !== "undefined"
    ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    : false

const binder = (keys) => (key, cmd) => {
  keys[key] = cmd
}

// Adapted from prosemirror-example-setup
export function buildKeymap(schema) {
  const keys = {}
  let type
  const bind = binder(keys)

  bind("Mod-z", undo)
  bind("Shift-Mod-z", redo)
  bind("Backspace", undoInputRule)
  if (!mac) bind("Mod-y", redo)

  if ((type = schema.nodes.hard_break)) {
    const br = type
    const cmd = chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView())
      }
      return true
    })
    bind("Mod-Enter", cmd)
    bind("Shift-Enter", cmd)
    if (mac) bind("Ctrl-Enter", cmd)
  }

  if ((type = schema.nodes.bullet_list)) bind("Shift-Ctrl-8", wrapInList(type))
  if ((type = schema.nodes.ordered_list)) bind("Shift-Ctrl-9", wrapInList(type))
  if ((type = schema.nodes.blockquote)) bind("Ctrl->", wrapIn(type))

  if ((type = schema.nodes.list_item)) {
    bind("Enter", splitListItem(type))
    bind("Mod-[", liftListItem(type))
    bind("Mod-]", sinkListItem(type))
  }

  return keys
}

export function applyMarksKeymap(schema) {
  const keys = {}
  let type
  const bind = binder(keys)

  if ((type = schema.marks.strong)) {
    bind("Mod-b", toggleMark(type))
    bind("Mod-B", toggleMark(type))
  }
  if ((type = schema.marks.em)) {
    bind("Mod-i", toggleMark(type))
    bind("Mod-I", toggleMark(type))
  }
  if ((type = schema.marks.underline)) {
    bind("Mod-Shift-u", toggleMark(type))
    bind("Mod-Shift-U", toggleMark(type))
  }
  if ((type = schema.marks.strikethrough)) {
    bind("Mod-Shift-s", toggleMark(type))
    bind("Mod-Shift-S", toggleMark(type))
  }

  if ((type = schema.marks.link)) {
    bind("Mod-k", addLink)
    bind("Mod-K", addLink)
  }

  return keys
}
