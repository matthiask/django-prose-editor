import { Extension } from "@tiptap/core"
import { undo, redo } from "@tiptap/pm/history"
import { Plugin } from "@tiptap/pm/state"
import { crel } from "./utils.js"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

export const menuItemsFromEditor = (editor) => {
  return [
    blockTypeMenuItems(editor),
    nodesMenuItems(editor),
    linkMenuItems(editor),
    markMenuItems(editor),
    textAlignMenuItems(editor),
    tableMenuItems(editor),
    historyMenuItems(editor),
    htmlMenuItem(editor),
  ].filter(Boolean)
}

export const Menu = Extension.create({
  name: "menu",

  addOptions() {
    return {
      menuItems: menuItemsFromEditor,
    }
  },

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
    this.items.forEach(
      ({ command, dom, active = () => false, hidden = () => false }) => {
        // dispatch=null ==> dry run
        const enabled = command(this.editor.view.state, null, this.editor.view)
        dom.classList.toggle("disabled", !enabled)
        dom.classList.toggle("active", !!active(this.editor))
        dom.classList.toggle("hidden", !!hidden(this.editor))
      },
    )
  }

  destroy() {
    this.dom.remove()
  }
}

function textButton(textContent, title = "") {
  return crel("span", {
    className: "prose-menubar__button",
    textContent,
    title,
  })
}

function materialButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

const headingMenuItem = (editor, level) => {
  const dom = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
  })
  dom.append(
    crel("span", {
      className: "material-icons",
      textContent: "title",
      title: `heading ${level}`,
    }),
    crel("span", { className: "level", textContent: `${level}` }),
  )

  return {
    command: (_state, _dispatch) => {
      if (_dispatch) {
        editor.commands.toggleHeading({ level })
      }
      return true
    },
    dom,
    active(editor) {
      return editor.isActive("heading", { level })
    },
  }
}

function blockTypeMenuItems(editor) {
  const schema = editor.schema

  const extension = findExtension(editor, "heading")
  const levels = extension ? extension.options.levels : []
  const items = levels.map((level) => headingMenuItem(editor, level))

  let type
  if ((type = schema.nodes.bulletList)) {
    items.push({
      command: (_state, dispatch) => {
        if (dispatch) {
          editor.chain().focus().toggleBulletList().run()
        }
        return true
      },
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_editor) {
        return false
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    items.push({
      command: (_state, dispatch) => {
        if (dispatch) {
          editor.chain().focus().toggleOrderedList().run()
        }
        return true
      },
      dom: materialButton("format_list_numbered", "ordered list"),
      active(_editor) {
        return false
      },
    })
  }

  if (!items.length) return []

  return [
    ...items,
    {
      command: (_state, _dispatch) => {
        if (_dispatch) {
          editor.commands.setParagraph()
        }
        return true
      },
      dom: materialButton("notes", "paragraph"),
      active(_editor) {
        return false
      },
    },
  ]
}

function nodesMenuItems(editor) {
  const schema = editor.schema
  const items = []
  let type
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
      command: (_state, dispatch) => {
        if (dispatch) {
          editor.commands.setHorizontalRule()
        }
        return true
      },
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
      command: (_state, dispatch) => {
        if (dispatch) {
          editor.commands.addLink()
        }
        return !editor.state.selection.empty || editor.isActive("link")
      },
      dom: materialButton("insert_link", "insert link"),
      active: (editor) => editor.isActive(mark),
    },
    {
      command: (_state, dispatch) => {
        if (dispatch) {
          editor.commands.unsetLink()
        }
        return editor.isActive("link")
      },
      dom: materialButton("link_off", "remove link"),
      active() {
        return false
      },
      hidden(editor) {
        return !editor.isActive("link")
      },
    },
  ]
}

function historyMenuItems(editor) {
  return findExtension(editor, "history")
    ? [
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
    : null
}

function textAlignMenuItems(editor) {
  const alignmentItem = (alignment) => ({
    command: (_state, dispatch) => {
      dispatch && editor.commands.setTextAlign(alignment)
      return true
    },
    dom: materialButton(`format_align_${alignment}`, alignment),
    active() {
      return editor.isActive({ textAlign: alignment })
    },
  })

  return findExtension(editor, "textAlign")
    ? [
        alignmentItem("left"),
        alignmentItem("center"),
        alignmentItem("right"),
        alignmentItem("justify"),
      ]
    : null
}

function tableMenuItems(editor) {
  if (!findExtension(editor, "table")) return []

  const tableManipulationItem = (command, dom) => ({
    command: (_state, dispatch) => {
      if (dispatch) command()
      return true
    },
    dom,
    hidden() {
      return !editor.isActive("table")
    },
  })

  return [
    {
      command(_state, dispatch, _view) {
        if (dispatch) {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3 /* , withHeaderRow: true */ })
            .run()
        }
        return true
      },
      dom: materialButton("grid_on", "Insert table"),
    },
    tableManipulationItem(() => {
      editor.chain().focus().addColumnAfter().run()
    }, textButton("+Col")),
    tableManipulationItem(() => {
      editor.chain().focus().deleteColumn().run()
    }, textButton("-Col")),
    tableManipulationItem(() => {
      editor.chain().focus().addRowAfter().run()
    }, textButton("+Row")),
    tableManipulationItem(() => {
      editor.chain().focus().deleteRow().run()
    }, textButton("-Row")),
    tableManipulationItem(() => {
      editor.chain().focus().mergeCells().run()
    }, textButton("Merge")),
    tableManipulationItem(() => {
      editor.chain().focus().splitCell().run()
    }, textButton("Split")),
  ]
}

function htmlMenuItem(editor) {
  return findExtension(editor, "html")
    ? [
        {
          command: (_state, dispatch) => {
            if (dispatch) {
              editor.commands.editHTML()
            }
            return true
          },
          dom: materialButton("code", "edit HTML"),
          active: () => false,
        },
      ]
    : null
}
