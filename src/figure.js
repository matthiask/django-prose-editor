import { mergeAttributes, Node } from "@tiptap/core"

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
          dom.className = value
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
