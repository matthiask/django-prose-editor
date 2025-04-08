import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { crel, gettext } from "./utils.js"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

export const Menu = Extension.create({
  name: "menu",

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

    const itemGroups = (args) => {
      return _groups.map((group) =>
        _items[group].flatMap((fn) => fn(args)).flat(),
      )
    }

    addItems("blockType", blockTypeMenuItems)
    addItems("nodes", nodesMenuItems)
    addItems("marks", markMenuItems)
    addItems("link")
    addItems("textAlign", textAlignMenuItems)
    addItems("history", historyMenuItems)
    addItems("utility", utilityMenuItems)

    return { _items, _groups, addItems, itemGroups }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const itemGroups = this.storage.itemGroups({ editor })

    return [
      new Plugin({
        view() {
          const menuView = new MenuView(editor, itemGroups)
          const editorDomParent = editor.view.dom.parentNode

          // Insert both the placeholder and menubar
          editorDomParent.insertBefore(menuView.placeholder, editor.view.dom)
          editorDomParent.insertBefore(menuView.dom, editor.view.dom)

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
    this.isFloating = false

    // Create menubar element
    this.dom = crel("div", { className: "prose-menubar" })

    // Create placeholder element to prevent content jumps
    this.placeholder = crel("div", { className: "prose-menubar-placeholder" })

    // Create menu groups
    itemGroups
      .filter((group) => group.length)
      .forEach((group) => {
        const groupDOM = crel("div", { className: "prose-menubar__group" })
        this.dom.append(groupDOM)
        group.forEach(({ dom }) => groupDOM.append(dom))
      })

    // Initial update of button states
    this.update()

    // Handle menu item clicks
    this.dom.addEventListener("mousedown", (e) => {
      e.preventDefault()
      editor.view.focus()
      this.items.forEach(({ command, dom }) => {
        if (dom.contains(e.target)) {
          command(editor)
        }
      })
    })

    // Set up scroll handling for floating menubar
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })
    window.addEventListener("resize", this.handleScroll, { passive: true })

    // Initial position check - run immediately and again after a small delay
    // for better reliability
    const updateMenubarHeight = () => {
      this.menubarHeight = this.dom.offsetHeight
      this.placeholder.style.setProperty(
        "--menubar-height",
        `${this.menubarHeight}px`,
      )
      this.handleScroll()
    }

    // Run immediately
    updateMenubarHeight()

    // And again after a small delay to ensure accurate measurements
    setTimeout(updateMenubarHeight, 100)
  }

  handleScroll() {
    // Skip if we're in fullscreen mode, as that has its own styling
    if (this.editor.options.element.closest(".prose-editor-fullscreen")) {
      return
    }

    const editorRect = this.editor.options.element.getBoundingClientRect()
    const menubarRect = this.dom.getBoundingClientRect()

    // Check if we should float the menubar
    if (editorRect.top < 0 && editorRect.bottom > menubarRect.height) {
      if (!this.isFloating) {
        // Make the menubar float
        this.dom.classList.add("prose-menubar--floating")
        this.placeholder.classList.add("prose-menubar-placeholder--active")

        // Set the width to match the editor
        this.dom.style.width = `${editorRect.width}px`
        this.dom.style.left = `${editorRect.left}px`
        this.dom.style.top = "0px"

        this.isFloating = true
      }
    } else if (this.isFloating) {
      // Return the menubar to normal positioning
      this.dom.classList.remove("prose-menubar--floating")
      this.placeholder.classList.remove("prose-menubar-placeholder--active")
      this.dom.style.width = ""
      this.dom.style.left = ""
      this.dom.style.top = ""
      this.isFloating = false
    }
  }

  update() {
    this.items.forEach(
      ({
        dom,
        enabled = () => true,
        active = () => false,
        hidden = () => false,
        update = null,
      }) => {
        dom.classList.toggle("disabled", !enabled(this.editor))
        dom.classList.toggle("active", !!active(this.editor))
        dom.classList.toggle("hidden", !!hidden(this.editor))

        // Call update if provided to update dynamic content
        if (update) {
          update(this.editor)
        }
      },
    )
  }

  destroy() {
    // Clean up event listeners
    window.removeEventListener("scroll", this.handleScroll)
    window.removeEventListener("resize", this.handleScroll)

    // Remove DOM elements
    this.dom.remove()
    this.placeholder.remove()
  }
}

/*
function textButton(textContent, title = "") {
  return crel("span", {
    className: "prose-menubar__button",
    textContent,
    title,
  })
}
*/

export function materialMenuButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

export function svgMenuButton(innerHTML, title = "") {
  return crel("span", {
    className: "prose-menubar__button",
    innerHTML,
    title,
  })
}

const headingButton = (level) => {
  const dom = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
    title: `heading ${level}`,
  })
  dom.append(
    crel("span", { className: "material-icons", textContent: "title" }),
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
    enabled(editor) {
      return editor.can().toggleHeading({ level })
    },
  }
}

function blockTypeMenuItems({ editor }) {
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
      dom: materialMenuButton("format_list_bulleted", "unordered list"),
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
      dom: materialMenuButton("format_list_numbered", "ordered list"),
      active(editor) {
        return editor.isActive("orderedList")
      },
    })

    // Add list properties button only if list attributes are enabled
    const orderedListExt = findExtension(editor, "orderedList")
    if (orderedListExt?.options.enableListAttributes) {
      items.push({
        command(editor) {
          editor.chain().focus().updateListAttributes().run()
        },
        dom: materialMenuButton("tune", gettext("List properties")),
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
      dom: materialMenuButton("notes", "paragraph"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setParagraph()
      },
    },
  ]
}

function nodesMenuItems({ editor }) {
  const schema = editor.schema
  const items = []
  let type
  if ((type = schema.nodes.blockquote)) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      dom: materialMenuButton("format_quote", "blockquote"),
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
      dom: materialMenuButton("horizontal_rule", "horizontal rule"),
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
      dom: materialMenuButton("image", "figure"),
      active(editor) {
        return editor.isActive("figure")
      },
      // TODO implement hidden(editor) and/or enabled(editor)
    })
  }
  return items
}

function markMenuItems({ editor }) {
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
    mark("bold", materialMenuButton("format_bold", "bold")),
    mark("italic", materialMenuButton("format_italic", "italic")),
    mark("underline", materialMenuButton("format_underline", "underline")),
    mark("strike", materialMenuButton("format_strikethrough", "strike")),
    mark("subscript", materialMenuButton("subscript", "subscript")),
    mark("superscript", materialMenuButton("superscript", "superscript")),
  ].filter(Boolean)
}

function historyMenuItems({ editor }) {
  return findExtension(editor, "history")
    ? [
        {
          command(editor) {
            editor.commands.undo()
          },
          enabled(editor) {
            return editor.can().undo()
          },
          dom: materialMenuButton("undo", "undo"),
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
          dom: materialMenuButton("redo", "redo"),
          active() {
            return false
          },
        },
      ]
    : []
}

function textAlignMenuItems({ editor }) {
  const alignmentItem = (alignment) => ({
    command(editor) {
      editor.chain().focus().setTextAlign(alignment).run()
    },
    dom: materialMenuButton(`format_align_${alignment}`, alignment),
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

function utilityMenuItems({ editor }) {
  const items = []

  if (findExtension(editor, "html")) {
    items.push({
      command(editor) {
        editor.commands.editHTML()
      },
      dom: materialMenuButton("code", "edit HTML"),
    })
  }

  if (findExtension(editor, "fullscreen")) {
    // Create button with dynamic content based on fullscreen state
    const dom = materialMenuButton("", gettext("Toggle fullscreen"))

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
