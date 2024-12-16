import { Extension } from "@tiptap/core"

import { htmlDialog } from "./commands.js"

export const HTML = Extension.create({
  name: "html",

  addCommands() {
    return {
      editHTML:
        () =>
        ({ editor }) => {
          htmlDialog(editor, { html: editor.getHTML() }).then((attrs) => {
            if (attrs) {
              editor.chain().focus().setContent(attrs.html, true).run()
            }
          })
        },
    }
  },
})
