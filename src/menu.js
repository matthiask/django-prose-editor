import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { wrapInList } from "prosemirror-schema-list"
import { Plugin } from "prosemirror-state"

import {
  addLink,
  removeLink,
  updateHTML,
  insertHorizontalRule,
} from "./commands.js"
import { crel } from "./utils.js"

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

function headingButton(level) {
  let btn = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
  })
  btn.append(
    crel("span", {
      className: "material-icons",
      textContent: "title",
      title: `heading ${level}`,
    }),
    crel("span", { className: "level", textContent: `${level}` })
  )
  return btn
}

function materialButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

export function blockTypeMenuItems(schema) {
  const heading = (level) => ({
    command: setBlockType(schema.nodes.heading, { level }),
    dom: headingButton(level),
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
      dom: materialButton("notes", "paragraph"),
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
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_state) {
        return false
      },
    },
    {
      command: wrapInList(schema.nodes.ordered_list),
      dom: materialButton("format_list_numbered", "ordered list"),
      active(_state) {
        return false
      },
    },
    {
      command: wrapIn(schema.nodes.blockquote),
      dom: materialButton("format_quote", "blockquote"),
      active(_state) {
        return false
      },
    },
    {
      command: insertHorizontalRule,
      dom: materialButton("horizontal_rule", "horizontal rule"),
      active(_state) {
        return false
      },
    },
  ]
}

export function markMenuItems(schema) {
  const mark = (markType, textContent, title) => ({
    command: toggleMark(markType),
    dom: materialButton(textContent, title),
    active: (state) => markActive(state, markType),
  })

  return [
    mark(schema.marks.strong, "format_bold", "bold"),
    mark(schema.marks.em, "format_italic", "italic"),
    mark(schema.marks.underline, "format_underline", "underline"),
    mark(schema.marks.strikethrough, "format_strikethrough", "strikethrough"),
    mark(schema.marks.sub, "subscript", "subscript"),
    mark(schema.marks.sup, "superscript", "superscript"),
  ]
}

export function linkMenuItems(schema) {
  return [
    {
      command: addLink,
      dom: materialButton("insert_link", "insert link"),
      active: addLink,
    },
    {
      command: removeLink,
      dom: materialButton("link_off", "remove link"),
      active: (state) => markActive(state, schema.marks.link),
    },
  ]
}

export function historyMenuItems() {
  return [
    {
      command: undo,
      dom: materialButton("undo", "undo"),
      active(_state) {
        return false
      },
    },
    {
      command: redo,
      dom: materialButton("redo", "redo"),
      active(_state) {
        return false
      },
    },
  ]
}

export function htmlMenuItem(editorViewInstance) {
  return [
    {
      command: updateHTML(editorViewInstance),
      dom: materialButton("code", "edit HTML"),
      active: () => false,
    },
  ]
}

class MenuView {
  constructor(itemGroups, editorView) {
    itemGroups.push(htmlMenuItem(editorView))
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
