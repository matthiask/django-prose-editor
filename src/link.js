import { Link as BaseLink } from "@tiptap/extension-link"

import { linkDialog } from "./commands.js"

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

  addCommands() {
    return {
      ...this.parent?.(),
      addLink:
        () =>
        ({ editor }) => {
          const attrs = editor.getAttributes(this.name)

          linkDialog(editor, attrs).then((attrs) => {
            if (attrs) {
              const cmd = editor
                .chain()
                .focus()
                .extendMarkRange(this.name)
                .unsetMark(this.name)

              if (attrs.definition) {
                cmd.setMark(this.name, attrs)
              }

              cmd.run()
            }
          })
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
        editor.commands.addLink()
      },
    }
  },
})
