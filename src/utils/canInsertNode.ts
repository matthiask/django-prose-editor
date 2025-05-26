import type { NodeType } from "@tiptap/pm/model"
import type { EditorState } from "@tiptap/pm/state"

/**
 * Utility function to check if a node can be inserted at the current selection
 *
 * @param state - The current editor state
 * @param nodeType - The node type to check for insertion
 * @returns Whether the node can be inserted at the current position
 */
export function canInsertNode(state: EditorState, nodeType: NodeType): boolean {
  // Check if the node type exists in schema
  if (!nodeType) {
    return false
  }

  // Check if we can insert the node at the current position
  const { selection } = state
  const { $from } = selection

  // Determine if the node can be inserted at the current position
  let canInsert = false

  // Special handling for the top level (direct children of the document)
  if ($from.depth === 0) {
    // For top-level nodes, we need to check if we can insert between existing nodes
    const index = $from.index()

    // Check if we can insert the node at the current position in the document
    canInsert = $from.parent.canReplaceWith(index, index, nodeType)
  } else {
    // Check if we can insert the node after the current block
    const afterPos = $from.after()
    // Make sure afterPos is valid
    if (afterPos <= state.doc.content.size) {
      const $pos = state.doc.resolve(afterPos)
      const parentNode = $pos.parent
      const index = $pos.indexAfter()

      canInsert = parentNode.canReplaceWith(index, index, nodeType)
    }

    // If we can't insert directly, try to find if it's possible to split
    // the current node and insert the node
    if (!canInsert) {
      // Try to find a position to split
      let depth = $from.depth
      while (depth > 0 && !canInsert) {
        const node = $from.node(depth - 1)
        const index = $from.indexAfter(depth - 1)
        canInsert = node.canReplaceWith(index, index, nodeType)
        depth--
      }
    }
  }

  return canInsert
}
