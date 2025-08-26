import { Extension } from "@tiptap/core"
import { crel } from "./utils.js"

const cssClass = (c) => (typeof c === "string" ? { className: c, title: c } : c)

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

    // Helper function to get the display title for a node type
    const getNodeTypeTitle = (nodeType) => {
      const nodeConfig = this.options.cssClasses[nodeType]
      if (
        typeof nodeConfig === "object" &&
        nodeConfig.title &&
        !Array.isArray(nodeConfig)
      ) {
        return nodeConfig.title
      }
      return nodeType
    }

    // Helper function to get the classes for a node type
    const getNodeTypeClasses = (nodeType) => {
      const nodeConfig = this.options.cssClasses[nodeType]
      if (
        typeof nodeConfig === "object" &&
        nodeConfig.cssClasses &&
        !Array.isArray(nodeConfig)
      ) {
        return nodeConfig.cssClasses
      }
      return Array.isArray(nodeConfig) ? nodeConfig : []
    }

    // Add a global "Reset classes" option that clears all node classes
    menu.defineItem({
      name: `${this.name}:global:reset`,
      groups: this.name,
      button: buttons.text("Block style"),
      option: crel("p", {
        textContent: "Reset classes",
      }),
      active(_editor) {
        // Always active so this is always shown as the dropdown button
        return true
      },
      hidden(_editor) {
        // Never hidden so always available
        return false
      },
      command(editor) {
        // Remove classes from all applicable ancestor nodes
        const applicableNodes = getApplicableNodeTypes(editor)
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            for (const { pos } of applicableNodes) {
              tr.setNodeAttribute(pos, "class", null)
            }
            return true
          })
          .run()
      },
    })

    // Create separate menu items for each node type and its classes
    for (const nodeType of Object.keys(this.options.cssClasses)) {
      const classes = getNodeTypeClasses(nodeType)
      if (!classes || classes.length === 0) continue

      // Add class options for this node type
      for (const cls of classes) {
        const { className, title } = cssClass(cls)
        const nodeTypeTitle = getNodeTypeTitle(nodeType)

        menu.defineItem({
          name: `${this.name}:${nodeType}:${className}`,
          groups: this.name,
          button: buttons.text(`${nodeTypeTitle}: ${title}`),
          option: crel("p", {
            className: className,
            textContent: `${nodeTypeTitle}: ${title}`,
          }),
          active(editor) {
            // Active when this specific node type has this class
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
