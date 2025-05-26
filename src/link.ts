import type { Editor } from "@tiptap/core"
import { Link as BaseLink } from "@tiptap/extension-link"

import { materialMenuButton } from "./menu"
import { gettext, updateAttrsDialog } from "./utils"

interface LinkAttributes {
  href: string
  title?: string
  target?: string | null
  rel?: string | null
  openInNewWindow?: boolean
}

interface LinkOptions {
  openOnClick: boolean
  enableTarget: boolean
  HTMLAttributes: {
    target: string | null
    rel: string | null
    class: string | null
    title: string
  }
}

const linkDialogImpl = (
  editor: Editor,
  attrs: Partial<LinkAttributes>,
  options: LinkOptions,
) => {
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

  if (options.enableTarget) {
    ;(properties as any).openInNewWindow = {
      type: "boolean",
      title: gettext("Open in new window"),
    }
  }

  return updateAttrsDialog(properties, {
    title: gettext("Edit Link"),
  })(editor, attrs)
}

const linkDialog = async (
  editor: Editor,
  attrs: Partial<LinkAttributes> | undefined,
  options: LinkOptions,
): Promise<LinkAttributes | null> => {
  attrs = attrs || {}
  attrs.openInNewWindow = attrs.target === "_blank"
  const result = await linkDialogImpl(editor, attrs, options)
  if (result) {
    if (result.openInNewWindow) {
      result.target = "_blank"
      result.rel = "noopener"
    } else {
      result.target = null
      result.rel = null
    }
    return result as LinkAttributes
  }
  return null
}

export const Link = BaseLink.extend<LinkOptions>({
  addOptions(): LinkOptions {
    return {
      ...this.parent?.(),
      openOnClick: false,
      enableTarget: true,
      HTMLAttributes: {
        target: null,
        rel: null,
        class: null,
        title: "",
      },
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: this.options.HTMLAttributes.title,
      },
    }
  },

  addCommands() {
    this.editor.storage.menu.addItems("link", menuItems)

    return {
      ...this.parent?.(),
      addLink:
        () =>
        ({ editor }: { editor: Editor }) => {
          if (!editor.state.selection.empty || editor.isActive("link")) {
            const attrs = editor.getAttributes(
              this.name,
            ) as Partial<LinkAttributes>

            linkDialog(editor, attrs, this.options).then(
              (attrs: LinkAttributes | null) => {
                if (attrs) {
                  const cmd = editor
                    .chain()
                    .focus()
                    .extendMarkRange(this.name)
                    .unsetMark(this.name)

                  cmd.setMark(this.name, attrs)
                  cmd.run()
                }
              },
            )
          }
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }: { editor: Editor }) => {
        let e: Event | undefined
        if ((e = window.event)) {
          /* Disable browser behavior of focussing the search bar or whatever */
          e.preventDefault()
        }
        editor.commands.addLink()
      },
    }
  },
})

const menuItems = () => [
  {
    command(editor: Editor) {
      editor.chain().addLink().focus().run()
    },
    enabled(editor: Editor) {
      return !editor.state.selection.empty || editor.isActive("link")
    },
    dom: materialMenuButton("insert_link", "insert link"),
    active(editor: Editor) {
      return editor.isActive("link")
    },
  },
  {
    command(editor: Editor) {
      editor.chain().focus().unsetLink().run()
    },
    dom: materialMenuButton("link_off", "remove link"),
    hidden(editor: Editor) {
      return !editor.isActive("link")
    },
  },
]
