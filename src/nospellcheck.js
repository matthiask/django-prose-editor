import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"

export const NoSpellCheck = Extension.create({
  name: "noSpellCheck",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(editorView) {
          return new NoSpellCheckPlugin(editorView)
        },
      }),
    ]
  },
})

class NoSpellCheckPlugin {
  constructor(editorView) {
    this.editorView = editorView
    this.editorView.dom.setAttribute("spellcheck", "false")
  }

  update() {}

  destroy() {
    this.editorView.dom.removeAttribute("spellcheck")
  }
}
