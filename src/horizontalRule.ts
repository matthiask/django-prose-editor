import type { ChainedCommands } from "@tiptap/core"
import { HorizontalRule as TiptapHorizontalRule } from "@tiptap/extension-horizontal-rule"
import type { EditorState, Transaction } from "@tiptap/pm/state"
import type { Dispatch } from "@tiptap/pm/view"
import { canInsertNode } from "./utils/canInsertNode"

export const HorizontalRule = TiptapHorizontalRule.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      setHorizontalRule:
        () =>
        ({
          state,
          dispatch,
          chain,
        }: {
          state: EditorState
          dispatch?: Dispatch<Transaction>
          chain: () => ChainedCommands
        }) => {
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
