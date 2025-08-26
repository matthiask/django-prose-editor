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
        ({ state, tr }) => {
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
        ({ state, tr }) => {
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

  addMenuItems({ buttons, menu }) {
    // Helper function to get all applicable node types in the current selection
    const getApplicableNodeTypes = (editor) => {
      const { selection } = editor.state
      const { $from } = selection
      const applicableNodes = []

      let depth = $from.depth
      while (depth > 0) {
        const node = $from.node(depth)
        if (this.options.cssClasses[node.type.name]) {
          applicableNodes.push({
            nodeType: node.type.name,
            node: node,
            depth: depth,
            pos: $from.before(depth),
          })
        }
        depth--
      }

      return applicableNodes
    }

    // Create menu items for each node type and its classes
    for (const [nodeType, classes] of Object.entries(this.options.cssClasses)) {
      if (!classes || classes.length === 0) continue

      // Add "Default" option for this node type
      menu.defineItem({
        name: `${this.name}:${nodeType}:default`,
        groups: this.name,
        button: buttons.text(`${nodeType}: Default`),
        option: crel("p", {
          textContent: `${nodeType}: Default`,
        }),
        active(editor) {
          const applicableNodes = getApplicableNodeTypes(editor)
          const targetNode = applicableNodes.find(
            (n) => n.nodeType === nodeType,
          )
          return targetNode && !targetNode.node.attrs.class
        },
        hidden(editor) {
          const applicableNodes = getApplicableNodeTypes(editor)
          return !applicableNodes.some((n) => n.nodeType === nodeType)
        },
        command(editor) {
          const { selection } = editor.state
          const { $from } = selection

          let depth = $from.depth
          while (depth > 0) {
            const node = $from.node(depth)
            if (node.type.name === nodeType) {
              const pos = $from.before(depth)
              editor
                .chain()
                .focus()
                .command(({ tr }) => {
                  tr.setNodeAttribute(pos, "class", null)
                  return true
                })
                .run()
              return
            }
            depth--
          }
        },
      })

      // Add class options for this node type
      for (const cls of classes) {
        const { className, title } = cssClass(cls)

        menu.defineItem({
          name: `${this.name}:${nodeType}:${className}`,
          groups: this.name,
          button: buttons.text(`${nodeType}: ${title}`),
          option: crel("p", {
            className: className,
            textContent: `${nodeType}: ${title}`,
          }),
          active(editor) {
            const applicableNodes = getApplicableNodeTypes(editor)
            const targetNode = applicableNodes.find(
              (n) => n.nodeType === nodeType,
            )
            return targetNode && targetNode.node.attrs.class === className
          },
          hidden(editor) {
            const applicableNodes = getApplicableNodeTypes(editor)
            return !applicableNodes.some((n) => n.nodeType === nodeType)
          },
          command(editor) {
            const { selection } = editor.state
            const { $from } = selection

            let depth = $from.depth
            while (depth > 0) {
              const node = $from.node(depth)
              if (node.type.name === nodeType) {
                const pos = $from.before(depth)
                editor
                  .chain()
                  .focus()
                  .command(({ tr }) => {
                    tr.setNodeAttribute(pos, "class", className)
                    return true
                  })
                  .run()
                return
              }
              depth--
            }
          },
        })
      }
    }
  },
})
