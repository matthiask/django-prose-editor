import { Extension } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"

export const NoSpellCheck = Extension.create({
  name: "noSpellCheck",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(editorView: EditorView) {
          return new NoSpellCheckPlugin(editorView)
        },
      }),
    ]
  },
})

class NoSpellCheckPlugin {
  editorView: EditorView

  constructor(editorView: EditorView) {
    this.editorView = editorView
    this.editorView.dom.setAttribute("spellcheck", "false")
  }

  update(): void {}

  destroy(): void {
    this.editorView.dom.removeAttribute("spellcheck")
  }
}
