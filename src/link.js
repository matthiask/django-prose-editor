import { Link as BaseLink } from "@tiptap/extension-link"

import { gettext, updateAttrsDialog } from "./utils.js"

const linkDialogImpl = updateAttrsDialog(
  {
    href: {
      type: "string",
      title: gettext("URL"),
    },
    title: {
      type: "string",
      title: gettext("Title"),
    },
    openInNewWindow: {
      type: "boolean",
      title: gettext("Open in new window"),
    },
  },
  {
    title: gettext("Edit Link"),
  },
)
const linkDialog = async (editor, attrs) => {
  attrs = attrs || {}
  attrs.openInNewWindow = attrs.target === "_blank"
  attrs = await linkDialogImpl(editor, attrs)
  if (attrs) {
    if (attrs.openInNewWindow) {
      attrs.target = "_blank"
      attrs.rel = "noopener noreferrer nofollow"
    }
    return attrs
  }
}

export const Link = BaseLink.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      HTMLAttributes: {
        target: null,
        rel: null,
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
