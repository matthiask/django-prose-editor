import { Extension } from "@tiptap/core"
import { undo, redo } from "@tiptap/pm/history"
import { wrapInList } from "@tiptap/pm/schema-list"
import { Plugin } from "@tiptap/pm/state"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

export const menuItemsFromConfig = (config) => (editor) => {
  return [
    blockTypeMenuItems(editor, config.headingLevels),
    listMenuItems(editor),
    linkMenuItems(editor),
    markMenuItems(editor),
    findExtension(editor, "history") && historyMenuItems(),
    config.html ? htmlMenuItem() : null,
  ].filter(Boolean)
}

export const Menu = Extension.create({
  name: "menu",

  addProseMirrorPlugins() {
    const editor = this.editor
    const menuItems = this.options.menuItems(editor)

    return [
      new Plugin({
        view() {
          const menuView = new MenuView(editor, menuItems)
          editor.view.dom.parentNode.insertBefore(menuView.dom, editor.view.dom)
          return menuView
        },
      }),
    ]
  },
})

import {
  addLink,
  removeLink,
  updateHTML,
  insertHorizontalRule,
} from "./commands.js"
import { crel } from "./utils.js"

function headingButton(level) {
  const btn = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
  })
  btn.append(
    crel("span", {
      className: "material-icons",
      textContent: "title",
      title: `heading ${level}`,
    }),
    crel("span", { className: "level", textContent: `${level}` }),
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

function blockTypeMenuItems(editor, headingLevels) {
  if (!editor.schema.nodes.heading) return []

  const heading = (level) => ({
    command: (_state, _dispatch) => {
      if (_dispatch) {
        editor.commands.toggleHeading({ level })
      }
      return true
    },
    dom: headingButton(level),
    active(editor) {
      return editor.isActive("heading", { level })
    },
  })

  const extension = findExtension(editor, "heading")
  const levels = headingLevels || extension?.options?.levels || [1, 2, 3, 4, 5]

  return [
    ...levels.map(heading),
    {
      command: (_state, _dispatch) => {
        if (_dispatch) {
          editor.commands.setParagraph()
        }
        return true
      },
      dom: materialButton("notes", "paragraph"),
      active(editor) {
        return editor.isActive("paragraph")
      },
    },
  ]
}

function listMenuItems(editor) {
  const schema = editor.schema
  const items = []
  let type
  if ((type = schema.nodes.bulletList)) {
    items.push({
      command: wrapInList(type),
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_editor) {
        return false
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    items.push({
      command: wrapInList(type),
      dom: materialButton("format_list_numbered", "ordered list"),
      active(_editor) {
        return false
      },
    })
  }
  if ((type = schema.nodes.blockquote)) {
    items.push({
      command: (_state, _dispatch) => {
        if (_dispatch) {
          editor.commands.toggleBlockquote()
        }
        return true
      },
      dom: materialButton("format_quote", "blockquote"),
      active(editor) {
        return editor.isActive("blockquote")
      },
    })
  }
  if ((type = schema.nodes.horizontalRule)) {
    items.push({
      command: insertHorizontalRule,
      dom: materialButton("horizontal_rule", "horizontal rule"),
      active(_editor) {
        return false
      },
    })
  }
  return items
}

function markMenuItems(editor) {
  const mark = (markType, textContent, title) =>
    markType in editor.schema.marks
      ? {
          command: (_state, _dispatch) => {
            if (_dispatch) {
              editor.commands.toggleMark(markType)
            }
            return true
          },
          dom: materialButton(textContent, title),
          active: (editor) => editor.isActive(markType),
        }
      : null

  return [
    mark("bold", "format_bold", "bold"),
    mark("italic", "format_italic", "italic"),
    mark("underline", "format_underline", "underline"),
    mark("strikethrough", "format_strikethrough", "strikethrough"),
    mark("subscript", "subscript", "subscript"),
    mark("superscript", "superscript", "superscript"),
  ].filter(Boolean)
}

function linkMenuItems(editor) {
  const mark = editor.schema.marks.link
  if (!mark) return []

  return [
    {
      command: addLink,
      dom: materialButton("insert_link", "insert link"),
      active: (editor) => editor.isActive(mark),
    },
    {
      command: removeLink,
      dom: materialButton("link_off", "remove link"),
      active() {
        return false
      },
    },
  ]
}

function historyMenuItems() {
  return [
    {
      command: undo,
      dom: materialButton("undo", "undo"),
      active() {
        return false
      },
    },
    {
      command: redo,
      dom: materialButton("redo", "redo"),
      active() {
        return false
      },
    },
  ]
}

function htmlMenuItem() {
  return [
    {
      command: updateHTML,
      dom: materialButton("code", "edit HTML"),
      active: () => false,
    },
  ]
}

class MenuView {
  constructor(editor, itemGroups) {
    this.items = itemGroups.flat()
    this.editor = editor

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
      editor.view.focus()
      this.items.forEach(({ command, dom }) => {
        if (dom.contains(e.target)) {
          command(editor.view.state, editor.view.dispatch, editor.view)
        }
      })
    })
  }

  update() {
    this.items.forEach(({ command, dom, active }) => {
      // dispatch=null ==> dry run
      const enabled = command(this.editor.view.state, null, this.editor.view)
      dom.classList.toggle("disabled", !enabled)
      dom.classList.toggle("active", active(this.editor) || false)
    })
  }

  destroy() {
    this.dom.remove()
  }
}
