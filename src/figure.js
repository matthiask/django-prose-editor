import { mergeAttributes, Node } from "@tiptap/core"
import { crel, gettext } from "./utils.js"

/**
 * Extension for adding figures with images and captions
 */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "image caption",
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      class: {
        default: "figure",
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align,
            class: `figure figure--${attributes.align}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("figure")

      // Apply attributes to the figure element
      Object.entries(node.attrs).forEach(([attr, value]) => {
        if (attr === "class") {
          dom.className = `${value} figure--${node.attrs.align}`
        } else if (attr === "align") {
          dom.setAttribute("data-align", value)
        } else {
          dom.setAttribute(attr, value)
        }
      })

      // Content element
      const content = document.createElement("div")
      content.className = "figure-content"
      content.contentEditable = "false"

      // Append content to figure
      dom.appendChild(content)

      return {
        dom,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "figure") {
            return false
          }

          // Update attributes when node changes
          dom.className = `figure figure--${updatedNode.attrs.align}`
          dom.setAttribute("data-align", updatedNode.attrs.align)

          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertFigure:
        (attributes = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: attributes,
              content: [
                {
                  type: "image",
                  attrs: { src: "" },
                },
                {
                  type: "caption",
                  content: [
                    {
                      type: "text",
                      text: "",
                    },
                  ],
                },
              ],
            })
            .run()
        },
    }
  },
})

/**
 * Caption extension specifically for use within figures
 */
export const Caption = Node.create({
  name: "caption",
  content: "inline*",
  group: "block",
  isolating: true,

  addAttributes() {
    return {
      class: {
        default: "figure-caption",
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figcaption",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes), 0]
  },
})

// Add CSS for the figure extension
export const figureCss = `
.figure {
  display: flex;
  flex-direction: column;
  margin: 1.5rem 0;
  max-width: 100%;
}

.figure--left {
  align-items: flex-start;
  margin-right: auto;
}

.figure--center {
  align-items: center;
  margin-left: auto;
  margin-right: auto;
}

.figure--right {
  align-items: flex-end;
  margin-left: auto;
}

.figure-controls {
  display: flex;
  gap: 4px;
  position: absolute;
  top: -24px;
  right: 0;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 2px;
}

.figure:hover .figure-controls {
  opacity: 1;
}

.figure-control {
  all: unset;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 12px;
}

.figure-control:hover {
  background: #e0e0e0;
}

.figure-content {
  width: 100%;
  max-width: 100%;
  position: relative;
}

.figure figcaption.figure-caption {
  padding: 0.5rem 0;
  color: #555;
  font-style: italic;
  font-size: 0.9rem;
  text-align: center;
  margin-top: 0.5rem;
}

.figure img {
  max-width: 100%;
  height: auto;
}

.figure--left figcaption {
  text-align: left;
}

.figure--right figcaption {
  text-align: right;
}

/* Limit the width of figures based on alignment */
.figure--left, .figure--right {
  max-width: 50%;
}
`

// Menu item to insert a figure
export const insertFigureItem = (_editor) => {
  return {
    command: (editor) => {
      // Show a dialog for inserting a figure with an image URL
      const dialog = document.createElement("dialog")
      dialog.className = "prose-editor-dialog"

      const title = document.createElement("h3")
      title.className = "prose-editor-dialog-title"
      title.textContent = gettext("Insert Figure")

      const form = document.createElement("form")

      // Image URL field
      const urlLabel = document.createElement("label")
      urlLabel.textContent = gettext("Image URL")
      const urlInput = document.createElement("input")
      urlInput.type = "url"
      urlInput.placeholder = "https://example.com/image.jpg"

      // Caption field
      const captionLabel = document.createElement("label")
      captionLabel.textContent = gettext("Caption")
      const captionInput = document.createElement("input")
      captionInput.type = "text"
      captionInput.placeholder = gettext("Figure caption")

      // Alignment field
      const alignLabel = document.createElement("label")
      alignLabel.textContent = gettext("Alignment")
      const alignSelect = document.createElement("select")

      const alignOptions = [
        { value: "center", label: gettext("Center") },
        { value: "left", label: gettext("Left") },
        { value: "right", label: gettext("Right") },
      ]

      alignOptions.forEach((option) => {
        const optionElement = document.createElement("option")
        optionElement.value = option.value
        optionElement.textContent = option.label
        alignSelect.appendChild(optionElement)
      })

      // Buttons
      const buttonContainer = document.createElement("div")
      buttonContainer.style.marginTop = "1rem"

      const cancelButton = document.createElement("button")
      cancelButton.type = "button"
      cancelButton.textContent = gettext("Cancel")

      const insertButton = document.createElement("button")
      insertButton.type = "submit"
      insertButton.textContent = gettext("Insert")

      // Event handlers
      cancelButton.addEventListener("click", () => {
        dialog.close()
      })

      form.addEventListener("submit", (e) => {
        e.preventDefault()

        const imageUrl = urlInput.value.trim()
        const captionText = captionInput.value.trim()
        const alignment = alignSelect.value

        if (imageUrl) {
          editor
            .chain()
            .focus()
            .insertFigure({
              align: alignment,
            })
            .run()

          // Find the newly inserted figure and update its content
          // This has to be done in a setTimeout because the figure needs to be rendered first
          setTimeout(() => {
            const selection = editor.state.selection
            const $pos = selection.$anchor
            const node = $pos.node()

            if (node && node.type.name === "figure") {
              // The newly inserted figure is selected, now update its content
              const figurePos = $pos.pos - $pos.parentOffset

              // Update the image source
              editor
                .chain()
                .setNodeSelection(figurePos + 1)
                .updateAttributes("image", { src: imageUrl })
                .run()

              // Update the caption text
              if (captionText) {
                editor
                  .chain()
                  .setTextSelection(figurePos + node.nodeSize - 2)
                  .insertContent(captionText)
                  .run()
              }
            }
          }, 0)

          dialog.close()
        }
      })

      // Assemble the form
      form.appendChild(urlLabel)
      form.appendChild(urlInput)
      form.appendChild(captionLabel)
      form.appendChild(captionInput)
      form.appendChild(alignLabel)
      form.appendChild(alignSelect)

      buttonContainer.appendChild(cancelButton)
      buttonContainer.appendChild(insertButton)
      form.appendChild(buttonContainer)

      dialog.appendChild(title)
      dialog.appendChild(form)

      // Add dialog to DOM and show it
      editor.view.dom.closest(".prose-editor").appendChild(dialog)
      dialog.showModal()
    },
    dom: crel("span", {
      className: "prose-menubar__button material-icons",
      textContent: "image",
      title: gettext("Insert figure"),
    }),
  }
}

// Add the Figure extension to the menu
export const addFigureToMenu = (menuItems) => {
  // Find the nodes menu group
  const nodesGroup = menuItems.find((group) =>
    group.some(
      (item) =>
        item.dom.title === "blockquote" || item.dom.title === "horizontal rule",
    ),
  )

  if (nodesGroup) {
    // Add the figure item to the nodes group
    nodesGroup.push(insertFigureItem)
  }

  return menuItems
}
