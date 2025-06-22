import { canInsertNode } from "@tiptap/core"
import { HorizontalRule as TiptapHorizontalRule } from "@tiptap/extension-horizontal-rule"

export const HorizontalRule = TiptapHorizontalRule.extend({
  addCommands() {
    return {
      ...this.parent(),
      setHorizontalRule:
        () =>
        ({ state, dispatch, chain }) => {
          const nodeType = state.schema.nodes[this.name]

          // Check if we can insert a horizontal rule
          const canInsert = canInsertNode(state, nodeType)

          if (!dispatch) {
            return canInsert
          }

          if (!canInsert) {
            return false
          }

          return chain().insertContent({ type: this.name }).run()
        },
    }
  },
})
