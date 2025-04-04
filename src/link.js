import { Link as BaseLink } from "@tiptap/extension-link"

import { gettext, updateAttrsDialog, findExtension } from "./utils.js"

const linkDialogImpl = (editor, attrs, options) => {
  const properties = {
    href: {
      type: "string",
      title: gettext("URL"),
    },
    title: {
      type: "string",
      title: gettext("Title"),
    },
  }

  if (!options.hideOpenInNewWindow)
    properties.openInNewWindow = {
      type: "boolean",
      title: gettext("Open in new window"),
    }

  return updateAttrsDialog(properties, {
    title: gettext("Edit Link"),
  })(editor, attrs)
}
const linkDialog = async (editor, attrs, options) => {
  attrs = attrs || {}
  attrs.openInNewWindow = attrs.target === "_blank"
  attrs = await linkDialogImpl(editor, attrs, options)
  if (attrs) {
    if (attrs.openInNewWindow) {
      attrs.target = "_blank"
      attrs.rel = "noopener"
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
          const options = findExtension(editor, "link")?.options

          linkDialog(editor, attrs, options).then((attrs) => {
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
