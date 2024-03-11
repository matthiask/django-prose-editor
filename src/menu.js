import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { wrapInList } from "prosemirror-schema-list"
import { Plugin } from "prosemirror-state"

import { getMarkRange } from "./extendMarkRange.js"
import { crel, trimmedRangeFromSelection } from "./utils.js"

export function menuPlugin(items) {
  return new Plugin({
    view(editorView) {
      const menuView = new MenuView(items, editorView)
      editorView.dom.parentNode.insertBefore(menuView.dom, editorView.dom)

      return menuView
    },
  })
}

function markActive(state, type) {
  const { from, $from, to, empty } = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, type)
}

function menuButtonDOM(textContent, style = "") {
  return crel("span", {
    className: "prose-menubar__button",
    style,
    textContent,
  })
}

export function blockTypeMenuItems(schema) {
  const heading = (level) => ({
    command: setBlockType(schema.nodes.heading, { level }),
    dom: menuButtonDOM(`H${level}`),
    active(state) {
      return state.selection.$from.parent.hasMarkup(schema.nodes.heading, {
        level,
      })
    },
  })

  return [
    heading(1),
    heading(2),
    heading(3),
    {
      command: setBlockType(schema.nodes.paragraph),
      dom: menuButtonDOM("P"),
      active(state) {
        return state.selection.$from.parent.hasMarkup(schema.nodes.paragraph)
      },
    },
  ]
}

export function listMenuItems(schema) {
  return [
    {
      command: wrapInList(schema.nodes.bullet_list),
      dom: menuButtonDOM("ul"),
      active(_state) {
        return false
      },
    },
    {
      command: wrapInList(schema.nodes.ordered_list),
      dom: menuButtonDOM("ol"),
      active(_state) {
        return false
      },
    },
    {
      command: wrapIn(schema.nodes.blockquote),
      dom: menuButtonDOM("”"),
      active(_state) {
        return false
      },
    },
  ]
}

export function markMenuItems(schema) {
  const mark = (markType, textContent, style) => ({
    command: toggleMark(markType),
    dom: menuButtonDOM(textContent, style),
    active: (state) => markActive(state, markType),
  })

  const sub = mark(schema.marks.sub, "sub", "")
  sub.dom.innerHTML = "<sub>x</sub>"
  const sup = mark(schema.marks.sup, "sup", "")
  sup.dom.innerHTML = "<sup>x</sup>"

  return [
    mark(schema.marks.strong, "B", "font-weight:bold"),
    mark(schema.marks.em, "I", "font-style:italic"),
    mark(schema.marks.underline, "U", "text-decoration:underline"),
    mark(schema.marks.strikethrough, "S", "text-decoration:line-through"),
    sub,
    sup,
  ]
}

const linkDialog = (attrs) => {
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog>
  <form>
  <p><label>URL</label> <input type="url" name="href"></p>
  <p><label>Titel</label> <input type="text" name="title"></p>
  <button type="submit">Speichern</button>
  <button value="cancel" formmethod="dialog">Abbrechen</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")
    form.href.value = attrs.href || ""
    form.title.value = attrs.title || ""

    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    div.querySelector("button[type=submit]").addEventListener("click", (e) => {
      e.preventDefault()
      div.remove()
      resolve(
        form.href.value
          ? { href: form.href.value, title: form.title.value }
          : null
      )
    })
    dialog.showModal()
  })
}

const addLink = (state, dispatch) => {
  const { $from, empty } = state.selection
  const type = state.schema.marks.link

  if (empty && !type.isInSet($from.marks())) return false

  if (dispatch) {
    let mark = $from.marks().find((mark) => mark.type === type)
    linkDialog(mark?.attrs || {}).then((attrs) => {
      console.debug(attrs)
      if (attrs) {
        let range
        if (empty) {
          range = getMarkRange($from, type)
          dispatch(
            state.tr
              .removeMark(range.from, range.to, type)
              .addMark(range.from, range.to, type.create(attrs))
          )
        } else {
          let { from, to } = trimmedRangeFromSelection(state.selection)
          dispatch(state.tr.addMark(from, to, type.create(attrs)))
        }
      }
    })
  }
  return true
}

const removeLink = (state, dispatch) => {
  const type = state.schema.marks.link
  const { $from, from, to } = state.selection
  const range = getMarkRange($from, type)
  if (range && range.from <= from && range.to >= to) {
    if (dispatch) {
      dispatch(state.tr.removeMark(range.from, range.to, type))
    }
    return true
  }
  return false
}

export function linkMenuItems(schema) {
  return [
    {
      command: addLink,
      dom: menuButtonDOM("link"),
      active: addLink,
    },
    {
      command: removeLink,
      dom: menuButtonDOM("unlink"),
      active: (state) => markActive(state, schema.marks.link),
    },
  ]
}

export function historyMenuItems() {
  return [
    {
      command: undo,
      dom: crel("span", {
        className: "prose-menubar__button prose-menubar__button--history-undo",
      }),
      active(_state) {
        return false
      },
    },
    {
      command: redo,
      dom: crel("span", {
        className: "prose-menubar__button prose-menubar__button--history-redo",
      }),
      active(_state) {
        return false
      },
    },
  ]
}

class MenuView {
  constructor(itemGroups, editorView) {
    this.items = itemGroups.flatMap((group) => group)
    this.editorView = editorView

    this.dom = crel("div", { className: "prose-menubar" })

    itemGroups
      .filter((group) => group.length)
      .forEach((group) => {
        const groupDOM = crel("div", { className: "prose-menubar__group" })
        this.dom.append(groupDOM)
        group.forEach(({ dom }) => groupDOM.append(dom))
      })
    this.update()

    this.dom.addEventListener("mousedown", (e) => {
      e.preventDefault()
      editorView.focus()
      this.items.forEach(({ command, dom }) => {
        if (dom.contains(e.target))
          command(editorView.state, editorView.dispatch, editorView)
      })
    })
  }

  update() {
    this.items.forEach(({ command, dom, active }) => {
      // dispatch=null ==> dry run
      const enabled = command(this.editorView.state, null, this.editorView)
      dom.classList.toggle("disabled", !enabled)
      dom.classList.toggle("active", active(this.editorView.state) || false)
    })
  }

  destroy() {
    this.dom.remove()
  }
}
