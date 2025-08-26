import { Extension } from "@tiptap/core"
import { crel } from "./utils.js"

const cssClass = (c) => (typeof c === "string" ? { className: c, title: c } : c)
const isValidClass = (cssClasses, nodeType, className) => {
  const nodeClasses = cssClasses[nodeType]
  if (!nodeClasses) return false
  return nodeClasses.find((c) => cssClass(c).className === className)
}

export const NodeClass = Extension.create({
  name: "nodeClass",

  addOptions() {
    return {
      cssClasses: {},
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: Object.keys(this.options.cssClasses),
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => {
              const className = element.className?.trim()
              if (!className) return null

              // The node type will be determined by Tiptap based on the element
              // We'll validate it in the parseHTML of each specific node type
              return className
            },
            renderHTML: (attributes) => {
              if (!attributes.class) {
                return {}
              }

              return {
                class: attributes.class,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setNodeClass:
        (className) =>
        ({ commands, state, tr }) => {
          const { selection } = state
          const { $from } = selection

          // Find the nearest block node
          let depth = $from.depth
          while (depth > 0) {
            const node = $from.node(depth)
            const nodeType = node.type.name

            if (this.options.cssClasses[nodeType]) {
              if (!isValidClass(this.options.cssClasses, nodeType, className)) {
                return false
              }

              const pos = $from.before(depth)
              tr.setNodeAttribute(pos, "class", className)
              return true
            }
            depth--
          }

          return false
        },
      unsetNodeClass:
        () =>
        ({ commands, state, tr }) => {
          const { selection } = state
          const { $from } = selection

          // Find the nearest block node with a class
          let depth = $from.depth
          while (depth > 0) {
            const node = $from.node(depth)
            const nodeType = node.type.name

            if (this.options.cssClasses[nodeType] && node.attrs.class) {
              const pos = $from.before(depth)
              tr.setNodeAttribute(pos, "class", null)
              return true
            }
            depth--
          }

          return false
        },
    }
  },

  addMenuItems({ buttons, menu, editor }) {
    // Create menu items for each node type and its classes
    for (const [nodeType, classes] of Object.entries(this.options.cssClasses)) {
      if (!classes || classes.length === 0) continue

      const menuItems = [
        { className: "default", title: "Default" },
        ...classes.map(cssClass),
      ]

      for (const { className, title } of menuItems) {
        menu.defineItem({
          name: `${this.name}:${nodeType}:${className}`,
          groups: this.name,
          button: buttons.text(title),
          option: crel("p", {
            className: className === "default" ? "" : className,
            textContent: title,
          }),
          active(editor) {
            const { selection } = editor.state
            const { $from } = selection

            // Find the nearest block node of the target type
            let depth = $from.depth
            while (depth > 0) {
              const node = $from.node(depth)
              if (node.type.name === nodeType) {
                if (className === "default") {
                  return !node.attrs.class
                } else {
                  return node.attrs.class === className
                }
              }
              depth--
            }

            return false
          },
          visible(editor) {
            const { selection } = editor.state
            const { $from } = selection

            // Only show menu items relevant to the current context
            let depth = $from.depth
            while (depth > 0) {
              const node = $from.node(depth)
              if (node.type.name === nodeType) {
                return true
              }
              depth--
            }

            return false
          },
          command(editor) {
            if (className === "default") {
              editor.chain().focus().unsetNodeClass().run()
            } else {
              editor.chain().focus().setNodeClass(className).run()
            }
          },
        })
      }
    }
  },
})
