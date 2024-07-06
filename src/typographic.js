// Plugin which shows typographic characters (currently only non-breaking spaces)

import { Plugin } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

// https://discuss.prosemirror.net/t/efficiently-finding-changed-nodes/4280/5
// Helper for iterating through the nodes in a document that changed
// compared to the given previous document. Useful for avoiding
// duplicate work on each transaction.
function changedDescendants(old, cur, offset, f) {
  const oldSize = old.childCount
  const curSize = cur.childCount
  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i)
    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) === child) {
        j = scan + 1
        offset += child.nodeSize
        continue outer
      }
    }
    f(child, offset)
    if (j < oldSize && old.child(j).sameMarkup(child))
      changedDescendants(old.child(j), child, offset + 1, f)
    else child.nodesBetween(0, child.content.size, f, offset + 1)
    offset += child.nodeSize
  }
}

const typographicDecorationsForNode = (node, position) => {
  const decorations = []
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
  return decorations
}

const typographicDecorations = (doc) => {
  const decorations = []
  doc.descendants((node, position) => {
    decorations.push(typographicDecorationsForNode(node, position))
  })
  return DecorationSet.create(doc, decorations.flat())
}

export const typographicPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return typographicDecorations(doc)
    },
    apply(tr, set, oldState) {
      // I fear that's not very performant. Maybe improve this "later".
      // return tr.docChanged ? typographicDecorations(tr.doc) : set

      let newSet = set.map(tr.mapping, tr.doc)
      changedDescendants(oldState.doc, tr.doc, 0, (node, offset) => {
        const decorations = typographicDecorationsForNode(node, offset)
        // Decorations seem to be merged somehow when they apply to the same position.
        // Maybe I should use DecorationSet.find and filter new decorations myself?
        newSet = newSet.add(tr.doc, decorations)
      })

      return newSet
    },
  },
  props: {
    decorations(state) {
      return typographicPlugin.getState(state)
    },
  },
})
