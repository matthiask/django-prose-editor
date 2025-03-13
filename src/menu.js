import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import { crel, gettext } from "./utils.js"
import {
  tableDialog,
  listPropertiesDialog,
  updateAttrsDialog,
} from "./commands.js"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

export const menuItemsFromEditor = (editor) => {
  // Basic menu items
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

    // Placeholder will be inserted in the plugin view function

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
        updateContent = null,
      }) => {
        dom.classList.toggle("disabled", !enabled(this.editor))
        dom.classList.toggle("active", !!active(this.editor))
        dom.classList.toggle("hidden", !!hidden(this.editor))

        // Call updateContent if provided to update dynamic content
        if (typeof updateContent === "function") {
          updateContent(this.editor)
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

function materialButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

function svgButton(svgContent, title = "") {
  const dom = crel("span", {
    className: "prose-menubar__button",
    title,
  })
  dom.innerHTML = svgContent
  return dom
}

function dynamicMaterialButton(getTextContent, title) {
  const dom = crel("span", {
    className: "prose-menubar__button material-icons",
    title,
  })

  // The getTextContent function will be called during update
  return {
    dom,
    updateContent: (editor) => {
      dom.textContent = getTextContent(editor)
    },
  }
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

// Define all list types in a single source of truth
const LIST_TYPES = [
  {
    label: "1, 2, 3, ...",
    htmlType: "1",
    description: gettext("Decimal numbers"),
  },
  {
    label: "a, b, c, ...",
    htmlType: "a",
    description: gettext("Lowercase letters"),
  },
  {
    label: "A, B, C, ...",
    htmlType: "A",
    description: gettext("Uppercase letters"),
  },
  {
    label: "i, ii, iii, ...",
    htmlType: "i",
    description: gettext("Lowercase Roman numerals"),
  },
  {
    label: "I, II, III, ...",
    htmlType: "I",
    description: gettext("Uppercase Roman numerals"),
  },
]

// Helper to convert list type label to HTML type attribute
const listTypeToHTMLType = (typeLabel) => {
  const found = LIST_TYPES.find((item) => item.label === typeLabel)
  return found ? found.htmlType : "1" // Default to decimal
}

// Helper to convert HTML type attribute to list type label
const htmlTypeToListType = (htmlType) => {
  const found = LIST_TYPES.find((item) => item.htmlType === htmlType)
  return found ? found.label : LIST_TYPES[0].label // Default to first option
}

// Get array of list type labels for dropdown options
const getListTypeOptions = () => LIST_TYPES.map((item) => item.label)

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
      active(editor) {
        return editor.isActive("orderedList")
      },
    })

    // Add list settings button right after the ordered list button
    items.push({
      command(editor) {
        // Get the ordered list node
        const { state } = editor
        const { selection } = state
        // Try different depths to find the list node
        let listNode
        for (let depth = 1; depth <= 3; depth++) {
          try {
            const node = selection.$anchor.node(-depth)
            if (node && node.type.name === "orderedList") {
              listNode = node
              break
            }
          } catch (_e) {
            // Node at this depth doesn't exist
          }
        }

        if (!listNode) {
          // Fallback to defaults if we can't find the node
          listNode = { attrs: { start: 1, type: "1" } }
        }

        // Extract current attributes
        const start = listNode?.attrs?.start || 1
        const type = listNode?.attrs?.type || "1"

        // Show properties dialog with dynamic enum options
        listPropertiesDialog(
          editor,
          {
            start: String(start),
            listType: htmlTypeToListType(type),
          },
          {
            enums: {
              listType: getListTypeOptions(),
            },
          },
        ).then((attrs) => {
          if (attrs) {
            // Convert settings to attributes
            const listType = listTypeToHTMLType(attrs.listType)
            const startValue = Number.parseInt(attrs.start, 10) || 1

            // Apply attributes to ordered list
            editor
              .chain()
              .focus()
              .updateAttributes("orderedList", {
                start: startValue,
                type: listType,
              })
              .run()
          }
        })
      },
      dom: materialButton("tune", gettext("List properties")),
      hidden(editor) {
        return !editor.isActive("orderedList")
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
  if ((type = schema.nodes.figure)) {
    items.push({
      command(editor) {
        // Check if a figure is currently selected
        const isEditingFigure = editor.isActive("figure")

        // Get current figure data if we're editing
        let currentImageSrc = ""
        let currentCaption = ""
        let currentAlignment = "center"

        if (isEditingFigure) {
          // Get the selected figure node
          const { state } = editor
          const { selection } = state
          const { $from } = selection

          // Try to find the figure node in the ancestors
          let figureNode = null
          let captionNode = null
          let imageNode = null

          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === "figure") {
              figureNode = node

              // Find the child nodes (image and caption)
              node.forEach((child, _, _i) => {
                if (child.type.name === "image") {
                  imageNode = child
                } else if (child.type.name === "caption") {
                  captionNode = child
                }
              })

              break
            }
          }

          if (figureNode && imageNode) {
            currentImageSrc = imageNode.attrs.src || ""
            currentAlignment = figureNode.attrs.align || "center"

            if (captionNode) {
              // Extract caption text
              const textContent = []
              captionNode.descendants((node) => {
                if (node.isText) {
                  textContent.push(node.text)
                }
                return true
              })
              currentCaption = textContent.join("")
            }
          }
        }

        // Define dialog properties
        const figureDialogProperties = {
          imageUrl: {
            type: "string",
            title: gettext("Image URL"),
            format: "url",
            required: true,
          },
          caption: {
            type: "string",
            title: gettext("Caption"),
          },
          alignment: {
            title: gettext("Alignment"),
            enum: [gettext("Center"), gettext("Left"), gettext("Right")],
            default: gettext("Center"),
          },
        }

        // Define dialog options
        const dialogOptions = {
          title: isEditingFigure
            ? gettext("Edit Figure")
            : gettext("Insert Figure"),
          submitText: isEditingFigure ? gettext("Update") : gettext("Insert"),
        }

        // Convert alignment to localized text
        function alignValueToText(value) {
          const map = {
            center: gettext("Center"),
            left: gettext("Left"),
            right: gettext("Right"),
          }
          return map[value] || gettext("Center")
        }

        // Convert localized text back to alignment value
        function alignTextToValue(text) {
          const map = {
            [gettext("Center")]: "center",
            [gettext("Left")]: "left",
            [gettext("Right")]: "right",
          }
          return map[text] || "center"
        }

        // Create initial attrs based on current values
        const initialAttrs = {
          imageUrl: currentImageSrc,
          caption: currentCaption,
          alignment: alignValueToText(currentAlignment),
        }

        // Use the updateAttrsDialog helper
        const dialogFn = updateAttrsDialog(
          figureDialogProperties,
          dialogOptions,
        )

        dialogFn(editor, initialAttrs).then((attrs) => {
          if (!attrs) return // Cancelled

          const imageUrl = attrs.imageUrl.trim()
          const captionText = attrs.caption.trim() || gettext("Figure caption")
          const alignment = alignTextToValue(attrs.alignment)

          if (imageUrl) {
            if (isEditingFigure) {
              // Update the existing figure
              // First update the figure's alignment
              editor
                .chain()
                .focus()
                .updateAttributes("figure", {
                  align: alignment,
                })
                .run()

              // Then update the image source - find the image node within the figure
              const { state } = editor
              const { selection } = state
              const { $from } = selection

              for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth)
                if (node.type.name === "figure") {
                  // Find positions of image and caption
                  let imagePos = null
                  let captionPos = null
                  const pos = $from.start(depth)

                  node.forEach((child, offset) => {
                    if (child.type.name === "image") {
                      imagePos = pos + offset
                    } else if (child.type.name === "caption") {
                      captionPos = pos + offset
                    }
                  })

                  // Update image source
                  if (imagePos !== null) {
                    editor
                      .chain()
                      .setNodeSelection(imagePos)
                      .updateAttributes("image", {
                        src: imageUrl,
                      })
                      .run()
                  }

                  // Update caption text by replacing its content
                  if (captionPos !== null) {
                    editor
                      .chain()
                      .setNodeSelection(captionPos)
                      .insertContent({
                        type: "caption",
                        content: [{ type: "text", text: captionText }],
                      })
                      .run()
                  }

                  break
                }
              }
            } else {
              // Insert a new figure
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "figure",
                  attrs: { align: alignment },
                  content: [
                    {
                      type: "image",
                      attrs: { src: imageUrl },
                    },
                    {
                      type: "caption",
                      content: [
                        {
                          type: "text",
                          text: captionText,
                        },
                      ],
                    },
                  ],
                })
                .run()
            }
          }
        })
      },
      dom: materialButton("image", "figure"),
      active(editor) {
        return editor.isActive("figure")
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
        // Show table configuration dialog
        tableDialog(editor, {
          rows: "3",
          cols: "3",
          withHeaderRow: "No",
        }).then((attrs) => {
          if (attrs) {
            const config = {
              rows: Number.parseInt(attrs.rows, 10) || 3,
              cols: Number.parseInt(attrs.cols, 10) || 3,
              withHeaderRow: attrs.withHeaderRow === "Yes",
            }

            // Insert table with the configured options
            editor.chain().focus().insertTable(config).run()
          }
        })
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
    // Create button with dynamic content based on fullscreen state
    const button = dynamicMaterialButton((editor) => {
      return editor.storage.fullscreen?.fullscreen
        ? "fullscreen_exit"
        : "fullscreen"
    }, "Toggle fullscreen")

    items.push({
      command(editor) {
        editor.commands.toggleFullscreen()
      },
      dom: button.dom,
      updateContent: button.updateContent,
      active(editor) {
        return editor.storage.fullscreen?.fullscreen
      },
    })
  }

  return items.length ? items : null
}
