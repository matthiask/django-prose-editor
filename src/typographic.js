// Plugin which shows typographic and invisible characters

import { Extension } from "@tiptap/core"

import { Plugin } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const Typographic = Extension.create({
  name: "typographic",

  addProseMirrorPlugins() {
    return [typographicPlugin, hardBreakPlugin]
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

// Separate plugin for handling hard breaks with NodeViews
const hardBreakPlugin = new Plugin({
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
