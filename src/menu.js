import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { crel, gettext } from "./utils.js"
import {
  materialButton,
  svgButton,
  createHeadingButton,
  createMarkButton,
  findExtension,
} from "./menu-utils.js"

// Registry for extensions to register their menu items
export class MenuRegistry {
  constructor() {
    // Main registry for menu items
    this.groups = new Map()

    // Default group order
    this.groupOrder = [
      "blockType",
      "marks",
      "nodes",
      "link",
      "textAlign",
      "table",
      "history",
      "utility",
      // Custom groups will be added at the end in registration order
    ]
  }

  /**
   * Register a group of menu items
   * @param {string} groupName - The name of the group
   * @param {Array} items - Array of menu items
   * @param {Object} options - Optional configuration
   * @param {number} options.index - Optional index to insert at specific position in groupOrder
   */
  registerGroup(groupName, items, options = {}) {
    // Skip registration if items is empty or null
    if (!items || !Array.isArray(items) || items.length === 0) {
      return
    }

    if (!this.groups.has(groupName)) {
      // Create new group
      this.groups.set(groupName, items)
    } else {
      // Append to existing group
      const existingItems = this.groups.get(groupName) || []
      this.groups.set(groupName, [...existingItems, ...items])
    }

    // Add to group order if not already there
    if (!this.groupOrder.includes(groupName)) {
      if (typeof options.index === "number") {
        this.groupOrder.splice(options.index, 0, groupName)
      } else {
        this.groupOrder.push(groupName)
      }
    }
  }

  /**
   * Get all menu item groups in order
   * @returns {Array} - Array of menu item groups
   */
  getAllGroups() {
    return this.groupOrder
      .map((groupName) => this.groups.get(groupName))
      .filter(Boolean)
  }
}

export const Menu = Extension.create({
  name: "menu",

  addOptions() {
    return {
      // Whether to collect menu items from extensions
      menuItemsFromExtensions: true,
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey("prose-menu"),

        view(editorView) {
          // Create a fresh registry for this view
          const registry = new MenuRegistry()

          // Register built-in menu items
          registerBuiltInMenuItems(registry, editor)

          // Get all menu groups
          const menuItems = registry.getAllGroups()

          // Create and insert the menu view
          const menuView = new MenuView(editor, menuItems)
          const editorDomParent = editorView.dom.parentNode

          editorDomParent.insertBefore(menuView.placeholder, editorView.dom)
          editorDomParent.insertBefore(menuView.dom, editorView.dom)

          return menuView
        },
      }),
    ]
  },
})

// Register all menu items
function registerBuiltInMenuItems(registry, editor) {
  // Default built-in menu items
  registry.registerGroup("blockType", getBlockTypeMenuItems(editor))
  registry.registerGroup("nodes", getNodesMenuItems(editor))
  registry.registerGroup("marks", getMarkMenuItems(editor))
  registry.registerGroup("textAlign", getTextAlignMenuItems(editor))
  registry.registerGroup("table", getTableMenuItems(editor))
  registry.registerGroup("history", getHistoryMenuItems(editor))
  registry.registerGroup("utility", getUtilityMenuItems(editor))

  // Backup link menu items to ensure they're always available
  registry.registerGroup("link", getLinkMenuItems(editor))

  // Skip if extension manager is not available
  if (!editor.extensionManager || !editor.extensionManager.extensions) {
    console.warn("No extension manager available for menu item registration")
    return
  }

  console.log(
    "[MENU] Available extensions:",
    editor.extensionManager.extensions.map((e) => e.name),
  )
  console.log("[MENU] Editor storage:", JSON.stringify(editor.storage))

  // Look for extensions with menuItems in their storage
  editor.extensionManager.extensions.forEach((extension) => {
    // Skip menu extension itself
    if (extension.name === "menu") return

    console.log(
      `[MENU] Checking extension: ${extension.name}`,
      editor.storage?.[extension.name]
        ? JSON.stringify(editor.storage[extension.name])
        : "NO STORAGE",
    )

    try {
      // Get menu items from extension storage
      const storage = editor.storage?.[extension.name]

      if (storage?.menuItems) {
        console.log(
          `[MENU] Found menuItems in ${extension.name}:`,
          JSON.stringify(storage.menuItems),
        )
        const { group, items, options = {} } = storage.menuItems
        if (group && Array.isArray(items) && items.length > 0) {
          console.log(
            `[MENU] Registering group ${group} with ${items.length} items from ${extension.name}`,
          )
          registry.registerGroup(group, items, options)
        }
      }
    } catch (error) {
      console.error(
        `[MENU] Error registering menu items from extension ${extension.name}:`,
        error,
      )
    }
  })
}

// Link menu items as a fallback
function getLinkMenuItems(editor) {
  if (
    !editor ||
    !editor.schema ||
    !editor.schema.marks ||
    !editor.schema.marks.link
  ) {
    return []
  }

  console.log("[MENU] Adding fallback link menu items")
  return [
    {
      command: (editor) => {
        editor.chain().addLink().focus().run()
      },
      enabled: (editor) => {
        return !editor.state.selection.empty || editor.isActive("link")
      },
      dom: materialButton("insert_link", "insert link"),
      active: (editor) => {
        return editor.isActive("link")
      },
    },
    {
      command: (editor) => {
        editor.chain().focus().unsetLink().run()
      },
      dom: materialButton("link_off", "remove link"),
      hidden: (editor) => {
        return !editor.isActive("link")
      },
    },
  ]
}

class MenuView {
  constructor(editor, itemGroups) {
    // Collect all items from groups
    this.items = Array.isArray(itemGroups)
      ? itemGroups.flat().filter(Boolean)
      : []

    this.editor = editor
    this.isFloating = false

    // Create menubar element
    this.dom = crel("div", { className: "prose-menubar" })

    // Create placeholder element to prevent content jumps
    this.placeholder = crel("div", { className: "prose-menubar-placeholder" })

    // Create menu groups
    if (Array.isArray(itemGroups)) {
      itemGroups
        .filter((group) => group && Array.isArray(group) && group.length)
        .forEach((group) => {
          const groupDOM = crel("div", { className: "prose-menubar__group" })
          this.dom.append(groupDOM)
          group.forEach((item) => {
            if (item?.dom) {
              groupDOM.append(item.dom)
            }
          })
        })
    }

    // Initial update of button states
    this.update()

    // Handle menu item clicks
    this.dom.addEventListener("mousedown", (e) => {
      e.preventDefault()
      editor.view.focus()
      this.items.forEach((item) => {
        if (item?.dom && item.command && item.dom.contains(e.target)) {
          item.command(editor)
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
        if (!dom) return

        try {
          dom.classList.toggle("disabled", !enabled(this.editor))
          dom.classList.toggle("active", !!active(this.editor))
          dom.classList.toggle("hidden", !!hidden(this.editor))

          // Call update if provided to update dynamic content
          if (update) {
            update(this.editor)
          }
        } catch (error) {
          console.error("Error updating menu item:", error)
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

// Menu item getter functions

function getMarkMenuItems(editor) {
  if (!editor || !editor.schema || !editor.schema.marks) {
    return []
  }

  return [
    createMarkButton(editor, "bold", materialButton("format_bold", "bold")),
    createMarkButton(
      editor,
      "italic",
      materialButton("format_italic", "italic"),
    ),
    createMarkButton(
      editor,
      "underline",
      materialButton("format_underline", "underline"),
    ),
    createMarkButton(
      editor,
      "strike",
      materialButton("format_strikethrough", "strike"),
    ),
    createMarkButton(
      editor,
      "subscript",
      materialButton("subscript", "subscript"),
    ),
    createMarkButton(
      editor,
      "superscript",
      materialButton("superscript", "superscript"),
    ),
  ].filter(Boolean)
}

function getBlockTypeMenuItems(editor) {
  if (!editor || !editor.schema) {
    return []
  }

  const schema = editor.schema
  const items = []

  // Add heading buttons
  const headingExt = findExtension(editor, "heading")
  if (headingExt?.options.levels) {
    const levels = headingExt.options.levels
    items.push(...levels.map((level) => createHeadingButton(level)))
  }

  // Add bullet list button
  if (schema.nodes.bulletList) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleBulletList().run()
      },
      dom: materialButton("format_list_bulleted", "unordered list"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().toggleBulletList()
      },
    })
  }

  // Add ordered list button
  if (schema.nodes.orderedList) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleOrderedList().run()
      },
      dom: materialButton("format_list_numbered", "ordered list"),
      active(editor) {
        return editor.isActive("orderedList")
      },
    })

    // Add list properties button if list attributes are enabled
    const orderedListExt = findExtension(editor, "orderedList")
    if (orderedListExt?.options.enableListAttributes) {
      items.push({
        command(editor) {
          editor.chain().focus().updateListAttributes().run()
        },
        dom: materialButton("tune", gettext("List properties")),
        hidden(editor) {
          return !editor.isActive("orderedList")
        },
      })
    }
  }

  // Add paragraph button
  if (items.length > 0) {
    items.push({
      command(editor) {
        editor.chain().focus().setParagraph().run()
      },
      dom: materialButton("notes", "paragraph"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setParagraph()
      },
    })
  }

  return items
}

function getNodesMenuItems(editor) {
  if (!editor || !editor.schema) {
    return []
  }

  const schema = editor.schema
  const items = []

  // Add blockquote button
  if (schema.nodes.blockquote) {
    items.push({
      command(editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      dom: materialButton("format_quote", "blockquote"),
      active(editor) {
        return editor.isActive("blockquote")
      },
      enabled(editor) {
        return editor.can().toggleBlockquote()
      },
    })
  }

  // Add horizontal rule button
  if (schema.nodes.horizontalRule) {
    items.push({
      command(editor) {
        editor.chain().focus().setHorizontalRule().run()
      },
      dom: materialButton("horizontal_rule", "horizontal rule"),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setHorizontalRule()
      },
    })
  }

  // Add figure button
  if (schema.nodes.figure) {
    items.push({
      command(editor) {
        editor.chain().focus().insertFigure().run()
      },
      dom: materialButton("image", "figure"),
      active(editor) {
        return editor.isActive("figure")
      },
      // TODO implement hidden(editor) and/or enabled(editor)
    })
  }

  return items
}

function getHistoryMenuItems(editor) {
  if (!findExtension(editor, "history")) {
    return []
  }

  return [
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
}

function getTextAlignMenuItems(editor) {
  if (!findExtension(editor, "textAlign")) {
    return []
  }

  const alignmentItem = (alignment) => ({
    command(editor) {
      editor.chain().focus().setTextAlign(alignment).run()
    },
    dom: materialButton(`format_align_${alignment}`, alignment),
    active() {
      return editor.isActive({ textAlign: alignment })
    },
  })

  return [
    alignmentItem("left"),
    alignmentItem("center"),
    alignmentItem("right"),
    alignmentItem("justify"),
  ]
}

function getTableMenuItems(editor) {
  if (!findExtension(editor, "table")) {
    return []
  }

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
        editor.chain().focus().insertTableWithOptions().run()
      },
      dom: materialButton("grid_on", "Insert table"),
    },
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().addColumnAfter().run()
      },
      svgButton(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <rect x="15" y="3" width="6" height="18" rx="1" fill="#4CAF50" fill-opacity="0.3" stroke="#4CAF50"/>
      <line x1="18" y1="9" x2="18" y2="15" stroke="#4CAF50" stroke-width="2"/>
      <line x1="15" y1="12" x2="21" y2="12" stroke="#4CAF50" stroke-width="2"/>
    </svg>`,
        "Add column",
      ),
    ),
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().deleteColumn().run()
      },
      svgButton(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <rect x="15" y="3" width="6" height="18" rx="1" fill="#F44336" fill-opacity="0.3" stroke="#F44336"/>
      <line x1="15" y1="12" x2="21" y2="12" stroke="#F44336" stroke-width="2"/>
    </svg>`,
        "Delete column",
      ),
    ),
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().addRowAfter().run()
      },
      svgButton(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <rect x="3" y="15" width="18" height="6" rx="1" fill="#4CAF50" fill-opacity="0.3" stroke="#4CAF50"/>
      <line x1="12" y1="15" x2="12" y2="21" stroke="#4CAF50" stroke-width="2"/>
      <line x1="9" y1="18" x2="15" y2="18" stroke="#4CAF50" stroke-width="2"/>
    </svg>`,
        "Add row",
      ),
    ),
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().deleteRow().run()
      },
      svgButton(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <rect x="3" y="15" width="18" height="6" rx="1" fill="#F44336" fill-opacity="0.3" stroke="#F44336"/>
      <line x1="9" y1="18" x2="15" y2="18" stroke="#F44336" stroke-width="2"/>
    </svg>`,
        "Delete row",
      ),
    ),
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().mergeCells().run()
      },
      materialButton("call_merge", "Merge cells"),
    ),
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().splitCell().run()
      },
      materialButton("call_split", "Split cell"),
    ),
    // Toggle header cell (works on selected cells or current cell)
    tableManipulationItem(
      (editor) => {
        editor.chain().focus().toggleHeaderCell().run()
      },
      svgButton(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <rect x="3" y="3" width="18" height="6" rx="1" fill="#2196F3" fill-opacity="0.3" stroke="#2196F3"/>
      <line x1="3" y1="9" x2="21" y2="9" stroke-width="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>`,
        "Toggle header cell",
      ),
    ),
  ]
}

function getUtilityMenuItems(editor) {
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
    // Create button with dynamic content based on fullscreen state
    const dom = materialButton("", gettext("Toggle fullscreen"))

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
