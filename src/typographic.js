// Plugin which shows typographic characters (currently only non-breaking spaces)

import { Plugin } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

const typographicDecorations = (doc) => {
  const decorations = []
  doc.descendants((node, position) => {
    if (node.text) {
      for (const match of node.text.matchAll(/\u00A0/g)) {
        const from = position + (match.index || 0)
        decorations.push(
          Decoration.inline(from, from + 1, {
            class: "prose-editor-nbsp",
          }),
        )
      }
    }
  })
  return DecorationSet.create(doc, decorations)
}

export const typographicPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return typographicDecorations(doc)
    },
    apply(tr, set) {
      // return set.map(tr.mapping, tr.doc)
      // I fear that's not very performant. Maybe improve this "later".
      return tr.docChanged ? typographicDecorations(tr.doc) : set
    },
  },
  props: {
    decorations(state) {
      return typographicPlugin.getState(state)
    },
  },
})
