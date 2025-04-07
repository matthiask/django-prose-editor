import { Link as BaseLink } from "@tiptap/extension-link"
import { gettext, updateAttrsDialog } from "./utils.js"
import { materialButton } from "./menu-utils.js"

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

  if (options.enableTarget)
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
    } else {
      attrs.target = null
      attrs.rel = null
    }
    return attrs
  }
}

export const Link = BaseLink.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      enableTarget: true,
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

          linkDialog(editor, attrs, this.options).then((attrs) => {
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

  // Set up our menu items after extension is created
  onCreate() {
    console.log("[LINK] Link extension onCreate called")

    // Make sure storage exists
    this.storage = this.storage || {}
    console.log(
      "[LINK] Link extension storage before:",
      JSON.stringify(this.storage),
    )

    // If menuItems are provided via configuration, use them
    // Otherwise, create the default menu items
    if (!this.storage.menuItems) {
      console.log("[LINK] Creating default menu items")
      this.storage.menuItems = {
        group: "link",
        items: [
          {
            command: (editor) => {
              editor.chain().addLink().focus().run()
            },
            enabled: (editor) => {
              return !editor.state.selection.empty || editor.isActive("link")
            },
            dom: materialButton("insert_link", "insert link"),
            active: (editor) => {
              return editor.isActive("link")
            },
          },
          {
            command: (editor) => {
              editor.chain().focus().unsetLink().run()
            },
            dom: materialButton("link_off", "remove link"),
            hidden: (editor) => {
              return !editor.isActive("link")
            },
          },
        ],
      }
    } else {
      console.log(
        "[LINK] Using provided menu items:",
        JSON.stringify(this.storage.menuItems),
      )
    }

    // If menuItems.items is empty, add default items to the custom group
    if (
      Array.isArray(this.storage.menuItems.items) &&
      this.storage.menuItems.items.length === 0
    ) {
      console.log("[LINK] Adding default items to empty custom group")
      this.storage.menuItems.items = [
        {
          command: (editor) => {
            editor.chain().addLink().focus().run()
          },
          enabled: (editor) => {
            return !editor.state.selection.empty || editor.isActive("link")
          },
          dom: materialButton("insert_link", "insert link"),
          active: (editor) => {
            return editor.isActive("link")
          },
        },
        {
          command: (editor) => {
            editor.chain().focus().unsetLink().run()
          },
          dom: materialButton("link_off", "remove link"),
          hidden: (editor) => {
            return !editor.isActive("link")
          },
        },
      ]
    }

    console.log(
      "[LINK] Link extension storage after:",
      JSON.stringify(this.storage),
    )
  },
})
