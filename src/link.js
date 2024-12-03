import { Link as BaseLink } from "@tiptap/extension-link"

import { addLink } from "./commands.js"

export const Link = BaseLink.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      HTMLAttributes: {
        target: null,
        rel: "noopener noreferrer nofollow",
        class: null,
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        let e
        if ((e = window.event)) {
          /* Disable browser behavior of focussing the search bar or whatever */
          e.preventDefault()
        }
        addLink(editor.view.state, editor.view.dispatch)
      },
    }
  },
})
