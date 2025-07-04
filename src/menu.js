import { Extension, getExtensionField } from "@tiptap/core"
import { crel, gettext } from "./utils.js"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

const createItemGroups = (groups, items, args) => {
  const defaults = {
    enabled: () => true,
    active: () => false,
    hidden: () => false,
    update: () => {},
  }
  return groups.map((group) =>
    items[group]
      .flatMap((fn) => fn(args))
      .flat()
      .map((item) => ({
        ...defaults,
        ...item,
      })),
  )
}

const updateMenuItems = (itemGroups, editor) => {
  if (itemGroups) {
    for (const group of itemGroups) {
      for (const { dom, enabled, active, hidden, update } of group) {
        dom.classList.toggle("disabled", !enabled(editor))
        dom.classList.toggle("active", !!active(editor))
        dom.classList.toggle("hidden", !!hidden(editor))
        update(editor)
      }
    }
  }
}

export const Menu = Extension.create({
  name: "menu",

  addOptions() {
    return {
      defaultItems: true,
      cssClass: "prose-menubar",
    }
  },

  addStorage() {
    // Menu items
    const _items = {}
    // Menu item groups in order
    const _groups = []
    const addItems = (group, items = 0, before = 0) => {
      if (!_groups.includes(group)) {
        let pos
        if (before && (pos = _groups.indexOf(before)) !== -1) {
          _groups.splice(pos, 0, group)
        } else {
          _groups.push(group)
        }
        _items[group] = []
      }
      const g = _items[group]
      if (items && !g.includes(items)) {
        g.push(items)
      }
    }

    const { defaultItems } = this.options
    if (defaultItems) {
      addItems("blockType", blockTypeMenuItems)
      addItems("nodes", nodeMenuItems)
      addItems("marks", markMenuItems)
      addItems("link")
      addItems("textAlign", textAlignMenuItems)
      addItems("history", historyMenuItems)
      addItems("utility", utilityMenuItems)
    }

    return { _items, _groups, addItems, dom: null }
  },

  onCreate({ editor }) {
    let fn
    for (const extension of editor.extensionManager.extensions) {
      if ((fn = getExtensionField(extension, "addMenuItems"))) {
        fn(this.storage)
      }
    }

    // Create menu directly
    const { cssClass } = this.options
    const { _groups, _items } = this.storage

    const itemGroups = createItemGroups(_groups, _items, {
      editor,
      buttons: buttonsCreator(cssClass),
    })

    // Create menubar element
    const menuDOM = crel("div", { className: cssClass })

    // Create menu groups
    itemGroups
      .filter((group) => group.length)
      .forEach((group) => {
        const groupDOM = crel("div", { className: `${cssClass}__group` })
        menuDOM.append(groupDOM)
        group.forEach(({ dom }) => groupDOM.append(dom))
      })

    // Initial update of button states
    updateMenuItems(itemGroups, editor)

    // Handle menu item clicks
    menuDOM.addEventListener("mousedown", (e) => {
      e.preventDefault()
      editor.view.focus()
      for (const group of itemGroups) {
        for (const { command, dom, enabled } of group) {
          if (dom.contains(e.target)) {
            if (enabled(editor)) {
              command(editor)
            }
            return
          }
        }
      }
    })

    editor.view.dom.before(menuDOM)

    this.storage.itemGroups = itemGroups
    this.storage.dom = menuDOM
  },

  onTransaction({ editor }) {
    updateMenuItems(this.storage.itemGroups, editor)
  },

  onDestroy() {
    if (this.storage.dom) {
      this.storage.dom.remove()
      this.storage.dom = null
      this.storage.itemGroups = null
    }
  },
})

const buttonsCreator = (cssClass) => {
  const text = (textContent, title = "", style = "") =>
    crel("span", {
      className: `${cssClass}__button`,
      style,
      textContent,
      title,
    })

  const material = (textContent, title = "") =>
    crel("span", {
      className: `${cssClass}__button material-icons`,
      textContent,
      title,
    })

  const svg = (innerHTML, title = "") =>
    crel("span", {
      className: `${cssClass}__button`,
      innerHTML,
      title,
    })

  const heading = (level) => {
    const dom = crel("span", {
      className: `${cssClass}__button ${cssClass}__button--heading`,
      title: `heading ${level}`,
    })
    dom.append(
      crel("span", { className: "material-icons", textContent: "title" }),
      crel("span", { className: "level", textContent: `${level}` }),
    )
    return dom
  }

  return { text, material, svg, heading }
}

const _buttons = buttonsCreator("prose-menubar")
export const materialMenuButton = _buttons.material
export const svgMenuButton = _buttons.svg

const headingButton = (level) => ({
  command: (editor) => {
    editor.chain().focus().toggleHeading({ level }).run()
  },
  dom: _buttons.heading(level),
  active(editor) {
    return editor.isActive("heading", { level })
  },
  enabled(editor) {
    return editor.can().toggleHeading({ level })
  },
})

function blockTypeMenuItems({ editor, buttons }) {
  const schema = editor.schema

  const extension = findExtension(editor, "heading")
  const levels = extension ? extension.options.levels : []
  const items = levels.map((level) => headingButton(level))

  let type
  if ((type = schema.nodes.bulletList)) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleBulletList().run()
      },
      dom: buttons.material("format_list_bulleted", "unordered list"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().toggleBulletList()
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleOrderedList().run()
      },
      dom: buttons.material("format_list_numbered", "ordered list"),
      active(editor) {
        return editor.isActive("orderedList")
      },
      enabled(editor) {
        return editor.can().toggleOrderedList()
      },
    })

    // Add list properties button only if list attributes are enabled
    const orderedListExt = findExtension(editor, "orderedList")
    if (orderedListExt?.options.enableListAttributes) {
      items.push({
        command(editor) {
          editor.chain().focus().updateListAttributes().run()
        },
        dom: buttons.material("tune", gettext("List properties")),
        hidden(editor) {
          return !editor.isActive("orderedList")
        },
      })
    }
  }

  if (!items.length) return []

  return [
    ...items,
    {
      command(editor) {
        editor.chain().focus().setParagraph().run()
      },
      dom: buttons.material("notes", "paragraph"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setParagraph()
      },
    },
  ]
}

function nodeMenuItems({ editor, buttons }) {
  const schema = editor.schema
  const items = []
  let type
  if ((type = schema.nodes.blockquote)) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      dom: buttons.material("format_quote", "blockquote"),
      active(editor) {
        return editor.isActive("blockquote")
      },
      enabled(editor) {
        return editor.can().toggleBlockquote()
      },
    })
  }
  if ((type = schema.nodes.horizontalRule)) {
    items.push({
      command(editor) {
        editor.chain().focus().setHorizontalRule().run()
      },
      dom: buttons.material("horizontal_rule", "horizontal rule"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setHorizontalRule()
      },
    })
  }
  if ((type = schema.nodes.figure)) {
    items.push({
      command(editor) {
        editor.chain().focus().insertFigure().run()
      },
      dom: buttons.material("image", "figure"),
      active(editor) {
        return editor.isActive("figure")
      },
      enabled(editor) {
        return editor.can().insertFigure()
      },
    })
  }
  return items
}

function markMenuItems({ editor, buttons }) {
  const mark = (markType, dom) =>
    markType in editor.schema.marks
      ? {
          command(editor) {
            editor.chain().focus().toggleMark(markType).run()
          },
          dom,
          active: (editor) => editor.isActive(markType),
          enabled: (editor) => editor.can().toggleMark(markType),
        }
      : null

  return [
    mark("bold", buttons.material("format_bold", "bold")),
    mark("italic", buttons.material("format_italic", "italic")),
    mark("underline", buttons.material("format_underline", "underline")),
    mark("strike", buttons.material("format_strikethrough", "strike")),
    mark("subscript", buttons.material("subscript", "subscript")),
    mark("superscript", buttons.material("superscript", "superscript")),
  ].filter(Boolean)
}

function historyMenuItems({ editor, buttons }) {
  return findExtension(editor, "history")
    ? [
        {
          command(editor) {
            editor.commands.undo()
          },
          enabled(editor) {
            return editor.can().undo()
          },
          dom: buttons.material("undo", "undo"),
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
          dom: buttons.material("redo", "redo"),
          active() {
            return false
          },
        },
      ]
    : []
}

function textAlignMenuItems({ editor, buttons }) {
  const alignmentItem = (alignment) => ({
    command(editor) {
      editor.chain().focus().setTextAlign(alignment).run()
    },
    dom: buttons.material(`format_align_${alignment}`, alignment),
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
    : []
}

function utilityMenuItems({ editor, buttons }) {
  const items = []

  if (findExtension(editor, "html")) {
    items.push({
      command(editor) {
        editor.commands.editHTML()
      },
      dom: buttons.material("code", "edit HTML"),
    })
  }

  if (findExtension(editor, "fullscreen")) {
    // Create button with dynamic content based on fullscreen state
    const dom = buttons.material("", gettext("Toggle fullscreen"))

    items.push({
      command(editor) {
        editor.commands.toggleFullscreen()
      },
      dom,
      update: (editor) => {
        dom.textContent = editor.storage.fullscreen?.fullscreen
          ? "fullscreen_exit"
          : "fullscreen"
      },
      active(editor) {
        return editor.storage.fullscreen?.fullscreen
      },
    })
  }

  return items
}
