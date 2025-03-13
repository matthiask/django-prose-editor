import { Extension } from "@tiptap/core"
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
    utilityMenuItems(editor),
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
          command(editor)
        }
      })
    })
  }

  update() {
    this.items.forEach(
      ({
        dom,
        enabled = () => true,
        active = () => false,
        hidden = () => false,
      }) => {
        dom.classList.toggle("disabled", !enabled(this.editor))
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

const headingMenuItem = (_editor, level) => {
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
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level }).run()
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
      command(editor) {
        editor.chain().focus().toggleBulletList().run()
      },
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_editor) {
        return false
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleOrderedList().run()
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
      command(editor) {
        editor.chain().focus().setParagraph().run()
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
      command(editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      dom: materialButton("format_quote", "blockquote"),
      active(editor) {
        return editor.isActive("blockquote")
      },
    })
  }
  if ((type = schema.nodes.horizontalRule)) {
    items.push({
      command(editor) {
        editor.chain().focus().setHorizontalRule().run()
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
  const mark = (markType, dom) =>
    markType in editor.schema.marks
      ? {
          command(editor) {
            editor.chain().focus().toggleMark(markType).run()
          },
          dom,
          active: (editor) => editor.isActive(markType),
        }
      : null

  return [
    mark("bold", materialButton("format_bold", "bold")),
    mark("italic", materialButton("format_italic", "italic")),
    mark("underline", materialButton("format_underline", "underline")),
    mark("strike", materialButton("format_strikethrough", "strike")),
    mark("subscript", materialButton("subscript", "subscript")),
    mark("superscript", materialButton("superscript", "superscript")),
  ].filter(Boolean)
}

function linkMenuItems(editor) {
  const mark = editor.schema.marks.link
  if (!mark) return []

  return [
    {
      command(editor) {
        editor.chain().addLink().focus().run()
      },
      enabled(editor) {
        return !editor.state.selection.empty || editor.isActive("link")
      },
      dom: materialButton("insert_link", "insert link"),
      active(editor) {
        return editor.isActive(mark)
      },
    },
    {
      command(editor) {
        editor.chain().focus().unsetLink().run()
      },
      dom: materialButton("link_off", "remove link"),
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
          command(editor) {
            editor.commands.undo()
          },
          enabled(editor) {
            return editor.can().undo()
          },
          dom: materialButton("undo", "undo"),
          active() {
            return false
          },
        },
        {
          command(editor) {
            editor.commands.redo()
          },
          enabled(editor) {
            return editor.can().redo()
          },
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
    command(editor) {
      editor.chain().focus().setTextAlign(alignment).run()
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
    command,
    dom,
    hidden() {
      return !editor.isActive("table")
    },
  })

  return [
    {
      command(editor) {
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
          .run()
      },
      dom: materialButton("grid_on", "Insert table"),
    },
    tableManipulationItem((editor) => {
      editor.chain().focus().addColumnAfter().run()
    }, textButton("+Col")),
    tableManipulationItem((editor) => {
      editor.chain().focus().deleteColumn().run()
    }, textButton("-Col")),
    tableManipulationItem((editor) => {
      editor.chain().focus().addRowAfter().run()
    }, textButton("+Row")),
    tableManipulationItem((editor) => {
      editor.chain().focus().deleteRow().run()
    }, textButton("-Row")),
    tableManipulationItem((editor) => {
      editor.chain().focus().mergeCells().run()
    }, textButton("Merge")),
    tableManipulationItem((editor) => {
      editor.chain().focus().splitCell().run()
    }, textButton("Split")),
  ]
}

function utilityMenuItems(editor) {
  const items = []

  if (findExtension(editor, "html")) {
    items.push({
      command(editor) {
        editor.commands.editHTML()
      },
      dom: materialButton("code", "edit HTML"),
    })
  }

  if (findExtension(editor, "fullscreen")) {
    items.push({
      command(editor) {
        editor.commands.toggleFullscreen()
      },
      dom: materialButton("fullscreen", "Toggle fullscreen"),
    })
  }

  return items.length ? items : null
}
