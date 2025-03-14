import { Link as BaseLink } from "@tiptap/extension-link"

import { gettext, updateAttrsDialog } from "./utils.js"

const linkDialog = updateAttrsDialog(
  {
    href: {
      type: "string",
      title: gettext("URL"),
    },
    title: {
      type: "string",
      title: gettext("Title"),
    },
  },
  {
    title: gettext("Edit Link"),
  },
)

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

              cmd.setMark(this.name, attrs)
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
