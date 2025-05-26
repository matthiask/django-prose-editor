import type { Editor, Extension as TiptapExtension } from "@tiptap/core"
import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { crel, gettext } from "./utils"

interface MenuItem {
  command: (editor: Editor) => void
  enabled: (editor: Editor) => boolean
  active: (editor: Editor) => boolean
  hidden: (editor: Editor) => boolean
  update: (editor: Editor) => void
  dom: HTMLElement
}

interface MenuItemDefaults {
  enabled: () => boolean
  active: () => boolean
  hidden: () => boolean
  update: () => void
}

interface MenuStorage {
  _items: Record<string, Array<(args: { editor: Editor }) => any>>
  _groups: string[]
  addItems: (group: string, items?: any, before?: string) => void
  itemGroups: (args: { editor: Editor }) => MenuItem[][]
}

const findExtension = (
  editor: Editor,
  extension: string,
): TiptapExtension | undefined =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

export const Menu = Extension.create<Record<string, never>, MenuStorage>({
  name: "menu",

  addStorage(): MenuStorage {
    // Menu items
    const _items: Record<string, Array<(args: { editor: Editor }) => any>> = {}
    // Menu item groups in order
    const _groups: string[] = []
    const addItems = (group: string, items: any = 0, before = ""): void => {
      if (!_groups.includes(group)) {
        let pos: number
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

    const itemGroups = (args: { editor: Editor }): MenuItem[][] => {
      const defaults: MenuItemDefaults = {
        enabled: () => true,
        active: () => false,
        hidden: () => false,
        update: () => {},
      }
      return _groups.map((group) =>
        _items[group]
          .flatMap((fn) => fn(args))
          .flat()
          .map((item) => ({
            ...defaults,
            ...item,
          })),
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
          const editorDomParent = editor.view.dom.parentNode as HTMLElement

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
  items: MenuItem[]
  editor: Editor
  isFloating = false
  dom: HTMLElement
  placeholder: HTMLElement
  menubarHeight?: number
  handleScroll: () => void

  constructor(editor: Editor, itemGroups: MenuItem[][]) {
    this.items = itemGroups.flat()
    this.editor = editor

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
    this.dom.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault()
      editor.view.focus()
      for (const { command, dom, enabled } of this.items) {
        if (dom.contains(e.target as Node)) {
          if (enabled(editor)) {
            command(editor)
          }
          break
        }
      }
    })

    // Set up scroll handling for floating menubar
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })
    window.addEventListener("resize", this.handleScroll, { passive: true })

    // Initial position check - run immediately and again after a small delay
    // for better reliability
    const updateMenubarHeight = (): void => {
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

  handleScroll(): void {
    // Skip if we're in fullscreen mode, as that has its own styling
    if (this.editor.options.element?.closest(".prose-editor-fullscreen")) {
      return
    }

    const editorRect = this.editor.options.element?.getBoundingClientRect()
    const menubarRect = this.dom.getBoundingClientRect()

    if (!editorRect) return

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

  update(): void {
    for (const { dom, enabled, active, hidden, update } of this.items) {
      dom.classList.toggle("disabled", !enabled(this.editor))
      dom.classList.toggle("active", !!active(this.editor))
      dom.classList.toggle("hidden", !!hidden(this.editor))
      update(this.editor)
    }
  }

  destroy(): void {
    // Clean up event listeners
    window.removeEventListener("scroll", this.handleScroll)
    window.removeEventListener("resize", this.handleScroll)

    // Remove DOM elements
    this.dom.remove()
    this.placeholder.remove()
  }
}

/*
function textButton(textContent: string, title = ""): HTMLElement {
  return crel("span", {
    className: "prose-menubar__button",
    textContent,
    title,
  })
}
*/

export function materialMenuButton(
  textContent: string,
  title: string,
): HTMLElement {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

export function svgMenuButton(innerHTML: string, title = ""): HTMLElement {
  return crel("span", {
    className: "prose-menubar__button",
    innerHTML,
    title,
  })
}

interface HeadingButtonItem {
  command: (editor: Editor) => void
  dom: HTMLElement
  active: (editor: Editor) => boolean
  enabled: (editor: Editor) => boolean
}

const headingButton = (level: number): HeadingButtonItem => {
  const dom = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
    title: `heading ${level}`,
  })
  dom.append(
    crel("span", { className: "material-icons", textContent: "title" }),
    crel("span", { className: "level", textContent: `${level}` }),
  )

  return {
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level }).run()
    },
    dom,
    active(editor: Editor) {
      return editor.isActive("heading", { level })
    },
    enabled(editor: Editor) {
      return editor.can().toggleHeading({ level })
    },
  }
}

function blockTypeMenuItems({ editor }: { editor: Editor }) {
  const schema = editor.schema

  const extension = findExtension(editor, "heading")
  const levels = extension ? (extension.options as any).levels : []
  const items = levels.map((level: number) => headingButton(level))

  let type
  if ((type = schema.nodes.bulletList)) {
    items.push({
      command(editor: Editor) {
        editor.chain().focus().toggleBulletList().run()
      },
      dom: materialMenuButton("format_list_bulleted", "unordered list"),
      active(_editor: Editor) {
        return false
      },
      enabled(editor: Editor) {
        return editor.can().toggleBulletList()
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    items.push({
      command(editor: Editor) {
        editor.chain().focus().toggleOrderedList().run()
      },
      dom: materialMenuButton("format_list_numbered", "ordered list"),
      active(editor: Editor) {
        return editor.isActive("orderedList")
      },
      enabled(editor: Editor) {
        return editor.can().toggleOrderedList()
      },
    })

    // Add list properties button only if list attributes are enabled
    const orderedListExt = findExtension(editor, "orderedList")
    if (
      orderedListExt?.options &&
      (orderedListExt.options as any).enableListAttributes
    ) {
      items.push({
        command(editor: Editor) {
          editor.chain().focus().updateListAttributes().run()
        },
        dom: materialMenuButton("tune", gettext("List properties")),
        hidden(editor: Editor) {
          return !editor.isActive("orderedList")
        },
      })
    }
  }

  if (!items.length) return []

  return [
    ...items,
    {
      command(editor: Editor) {
        editor.chain().focus().setParagraph().run()
      },
      dom: materialMenuButton("notes", "paragraph"),
      active(_editor: Editor) {
        return false
      },
      enabled(editor: Editor) {
        return editor.can().setParagraph()
      },
    },
  ]
}

function nodesMenuItems({ editor }: { editor: Editor }) {
  const schema = editor.schema
  const items = []
  let type
  if ((type = schema.nodes.blockquote)) {
    items.push({
      command(editor: Editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      dom: materialMenuButton("format_quote", "blockquote"),
      active(editor: Editor) {
        return editor.isActive("blockquote")
      },
      enabled(editor: Editor) {
        return editor.can().toggleBlockquote()
      },
    })
  }
  if ((type = schema.nodes.horizontalRule)) {
    items.push({
      command(editor: Editor) {
        editor.chain().focus().setHorizontalRule().run()
      },
      dom: materialMenuButton("horizontal_rule", "horizontal rule"),
      active(_editor: Editor) {
        return false
      },
      enabled(editor: Editor) {
        return editor.can().setHorizontalRule()
      },
    })
  }
  if ((type = schema.nodes.figure)) {
    items.push({
      command(editor: Editor) {
        editor.chain().focus().insertFigure().run()
      },
      dom: materialMenuButton("image", "figure"),
      active(editor: Editor) {
        return editor.isActive("figure")
      },
      enabled(editor: Editor) {
        return editor.can().insertFigure()
      },
    })
  }
  return items
}

function markMenuItems({ editor }: { editor: Editor }) {
  const mark = (markType: string, dom: HTMLElement) =>
    markType in editor.schema.marks
      ? {
          command(editor: Editor) {
            editor.chain().focus().toggleMark(markType).run()
          },
          dom,
          active: (editor: Editor) => editor.isActive(markType),
          enabled: (editor: Editor) => editor.can().toggleMark(markType),
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

function historyMenuItems({ editor }: { editor: Editor }) {
  return findExtension(editor, "history")
    ? [
        {
          command(editor: Editor) {
            editor.commands.undo()
          },
          enabled(editor: Editor) {
            return editor.can().undo()
          },
          dom: materialMenuButton("undo", "undo"),
          active() {
            return false
          },
        },
        {
          command(editor: Editor) {
            editor.commands.redo()
          },
          enabled(editor: Editor) {
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

function textAlignMenuItems({ editor }: { editor: Editor }) {
  const alignmentItem = (alignment: string) => ({
    command(editor: Editor) {
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

function utilityMenuItems({ editor }: { editor: Editor }) {
  const items = []

  if (findExtension(editor, "html")) {
    items.push({
      command(editor: Editor) {
        editor.commands.editHTML()
      },
      dom: materialMenuButton("code", "edit HTML"),
    })
  }

  if (findExtension(editor, "fullscreen")) {
    // Create button with dynamic content based on fullscreen state
    const dom = materialMenuButton("", gettext("Toggle fullscreen"))

    items.push({
      command(editor: Editor) {
        editor.commands.toggleFullscreen()
      },
      dom,
      update: (editor: Editor) => {
        dom.textContent = editor.storage.fullscreen?.fullscreen
          ? "fullscreen_exit"
          : "fullscreen"
      },
      active(editor: Editor) {
        return editor.storage.fullscreen?.fullscreen
      },
    })
  }

  return items
}
