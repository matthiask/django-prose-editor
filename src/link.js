import { Link as BaseLink } from "@tiptap/extension-link"

import { addLink } from "./commands.js"

export const Link = BaseLink.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        console.debug("editor", editor)
        addLink(editor.view.state, editor.view.dispatch)
      },
    }
  },
})
