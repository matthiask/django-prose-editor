// Plugin which shows typographic and invisible characters

import { Extension } from "@tiptap/core"

import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Typographic = Extension.create({
  name: "typographic",

  addStorage() {
    return {
      active: true, // Track the active state in storage for user toggling
    }
  },

  addCommands() {
    return {
      // Implement toggleTypographic as a simple wrapper around setTypographic
      toggleTypographic:
        () =>
        ({ editor }) => {
          // Get the current state and toggle it
          const newState = !editor.storage.typographic.active

          // Call setTypographic with the new state
          return editor.commands.setTypographic(newState)
        },

      // Primary command for changing the typographic state
      setTypographic:
        (active) =>
        ({ editor }) => {
          // Update the state in storage
          editor.storage.typographic.active = active

          // Force a re-render by dispatching a transaction with metadata
          editor.view.dispatch(
            editor.state.tr.setMeta("toggleTypographic", active),
          )

          // Force an update of hard breaks
          updateHardBreaks(editor.view, active)

          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    // Create a plugin key for special character decorations
    const typographicPluginKey = new PluginKey("typographic")

    // Create a typographic plugin with dynamic visibility
    const typographicPluginWithToggle = new Plugin({
      key: typographicPluginKey,
      state: {
        init(_, { doc }) {
          return typographicDecorations(doc)
        },
        apply(tr, set, _oldState) {
          // Always recalculate decorations when the document changes
          if (tr.docChanged) {
            return typographicDecorations(tr.doc)
          }
          return set.map(tr.mapping, tr.doc)
        },
      },
      props: {
        decorations(state) {
          // Only return decorations if the feature is enabled
          if (extension.editor?.storage.typographic.active) {
            return typographicPluginKey.getState(state)
          }
          return null
        },
      },
    })

    // Create a plugin for hard breaks that respects the toggle
    const hardBreakPluginWithToggle = new Plugin({
      key: hardBreakPluginKey,

      // Store the last known toggle state per editor instance
      state: {
        init() {
          // Default to true (visible)
          return { lastKnownState: true }
        },
        apply(tr, pluginState) {
          // Check if we have a toggle change in the transaction
          const meta = tr.getMeta("toggleTypographic")
          if (meta !== undefined) {
            // Update our plugin state with the new toggle value
            return { lastKnownState: meta }
          }
          return pluginState
        },
      },

      props: {
        // Completely replace the default node view handling for hard breaks
        nodeViews: {
          hardBreak: (node, _view, _getPos) => {
            // Get the current active state from the editor
            const isActive = extension.editor?.storage.typographic.active

            // Only return the custom node view if toggled on
            if (isActive) {
              return new HardBreakView(node)
            }

            // Return a simple BR node when toggled off
            // This effectively removes the highlighting
            const dom = document.createElement("br")
            return { dom, contentDOM: null, update: () => true }
          },
        },
      },

      // Add a plugin view to handle toggle state changes
      view: (view) => {
        return {
          update: () => {
            // Get the current toggle state from editor storage
            const currentState = extension.editor?.storage.typographic.active

            // Get the last known state from our plugin state
            const lastState = hardBreakPluginKey.getState(
              view.state,
            )?.lastKnownState

            // Only update if there was a change
            if (
              currentState !== undefined &&
              lastState !== undefined &&
              currentState !== lastState
            ) {
              // Update hard breaks when toggle state changes
              updateHardBreaks(view, currentState)

              // Store the new state in a transaction
              view.dispatch(
                view.state.tr.setMeta(hardBreakPluginKey, {
                  lastKnownState: currentState,
                }),
              )
            }
          },
          destroy: () => {},
        }
      },
    })

    // Always return both plugins
    return [typographicPluginWithToggle, hardBreakPluginWithToggle]
  },
})

const classes = {
  "\u00A0": "prose-editor-nbsp", // Non-breaking space
  "\u00AD": "prose-editor-shy", // Soft hyphen
  "\u200B": "prose-editor-zwsp", // Zero-width space
  "\u200C": "prose-editor-zwnj", // Zero-width non-joiner
  "\u200D": "prose-editor-zwj", // Zero-width joiner
  "\u2060": "prose-editor-wj", // Word joiner
  "\u2028": "prose-editor-ls", // Line separator
  "\u2029": "prose-editor-ps", // Paragraph separator
  "\u2003": "prose-editor-emsp", // Em space
  "\u2009": "prose-editor-thinsp", // Thin space
  "\u202F": "prose-editor-nnbsp", // Narrow no-break space
  "\u2002": "prose-editor-ensp", // En space
  "\u2004": "prose-editor-3persp", // Three-per-em space
  "\u2005": "prose-editor-4persp", // Four-per-em space
  "\u2006": "prose-editor-6persp", // Six-per-em space
  "\u2007": "prose-editor-figsp", // Figure space
  "\u2008": "prose-editor-psp", // Punctuation space
  "\u205F": "prose-editor-mmsp", // Medium mathematical space
  "\u180E": "prose-editor-mvs", // Mongolian vowel separator
  "\uFEFF": "prose-editor-bom", // Byte order mark
}

// Create a plugin key for hard breaks
const hardBreakPluginKey = new PluginKey("hardBreak")

// Custom NodeView for hard breaks
class HardBreakView {
  constructor(_node) {
    // Create a container for both the BR and our custom marker
    this.dom = document.createElement("span")
    this.dom.className = "prose-editor-br-container"

    // Add the marker span
    const marker = document.createElement("span")
    marker.className = "prose-editor-br-marker"
    marker.textContent = "↵"
    this.dom.appendChild(marker)

    // Add the actual BR element
    const br = document.createElement("br")
    this.dom.appendChild(br)

    // No content DOM since this is a leaf node
    this.contentDOM = null
  }

  update(node) {
    return node.type.name === "hardBreak"
  }

  stopEvent() {
    return false
  }

  ignoreMutation() {
    return true
  }
}

// Function to update the hard break representation
function updateHardBreaks(view, _active) {
  // Force a rebuild of all hard break nodes
  const tr = view.state.tr

  view.state.doc.descendants((node, pos) => {
    if (node.type.name === "hardBreak") {
      // Replace the node with itself to force the nodeView to update
      tr.replaceWith(pos, pos + node.nodeSize, node.type.create(node.attrs))
    }
  })

  if (tr.steps.length > 0) {
    view.dispatch(tr)
  }
}

// Separate plugin for handling hard breaks with NodeViews
const _hardBreakPlugin = new Plugin({
  props: {
    nodeViews: {
      hardBreak: (node, _view, _getPos) => new HardBreakView(node),
    },
  },
})

const typographicDecorationsForNode = (node, position) => {
  const decorations = []

  // For text nodes, look for special characters
  if (node.text) {
    // Create a regex pattern from all character keys in the classes object
    const pattern = new RegExp(`([${Object.keys(classes).join("")}])`, "g")
    for (const match of node.text.matchAll(pattern)) {
      const from = position + (match.index || 0)
      decorations.push(
        Decoration.inline(from, from + 1, {
          class: classes[match[1]],
        }),
      )
    }
  }

  return decorations
}

const typographicDecorations = (doc) => {
  const decorations = []
  doc.descendants((node, position) => {
    decorations.push(typographicDecorationsForNode(node, position))
  })
  return DecorationSet.create(doc, decorations.flat())
}

const typographicPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return typographicDecorations(doc)
    },
    apply(tr, set, _oldState) {
      // Simplest solution: Rebuild all decorations on doc changes
      // This ensures we catch all special characters, even those in adjacent nodes
      if (tr.docChanged) {
        return typographicDecorations(tr.doc)
      }

      // If the document hasn't changed, just map the existing decorations
      return set.map(tr.mapping, tr.doc)
    },
  },
  props: {
    decorations(state) {
      return typographicPlugin.getState(state)
    },
  },
})
