import { Plugin } from "prosemirror-state"

export function noSpellCheck() {
  return new Plugin({
    view(editorView) {
      return new NoSpellCheck(editorView)
    },
  })
}

class NoSpellCheck {
  constructor(editorView) {
    this.editorView = editorView
    this.editorView.dom.setAttribute("spellcheck", "false")
  }

  update() {}

  destroy() {
    this.editorView.dom.removeAttribute("spellcheck")
  }
}
