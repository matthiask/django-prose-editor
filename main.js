import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core"
import { commonmark } from "@milkdown/preset-commonmark"
import { history } from "@milkdown/plugin-history"
import { listener, listenerCtx } from "@milkdown/plugin-listener"
import { menu, menuDefaultConfig } from "@milkdown-lab/plugin-menu"

import { nord } from "@milkdown/theme-nord"
import "@milkdown/theme-nord/style.css"
import "@milkdown-lab/plugin-menu/style.css"
import "./main.css"

function milkdownEditor(element) {
  const blocker = document.createElement("style-blocker")
  blocker.style = "width:100%;flex-basis:100%"
  blocker.setAttribute(
    "css-files",
    "/static/content_editor/material-icons.css,/static/django_milkdown.css"
  )
  const div = document.createElement("div")
  blocker.append(div)
  element.before(blocker)

  Editor.make()
    .config(nord)
    .config(menuDefaultConfig)
    .config((ctx) => {
      ctx.set(rootCtx, div)
      ctx.set(defaultValueCtx, element.value)
    })
    .config((ctx) => {
      const listener = ctx.get(listenerCtx)
      listener.markdownUpdated((ctx, markdown, _prevMarkdown) => {
        element.value = markdown
      })
    })
    .use(commonmark)
    .use(history)
    .use(listener)
    .use(menu)
    .create()
}

window.milkdownEditor = milkdownEditor

/* Thanks, https://matthewjamestaylor.com/style-blocker */
window.customElements.define(
  "style-blocker",
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }
    connectedCallback() {
      while (this.childNodes.length > 0) {
        this.shadowRoot.appendChild(this.childNodes[0])
      }

      const cssFiles = this.getAttribute("css-files")
      if (cssFiles) {
        const arrCssFiles = cssFiles.split(",")
        for (let i = 0; i < arrCssFiles.length; i++) {
          let link = document.createElement("link")
          link.setAttribute("rel", "stylesheet")
          link.setAttribute("href", arrCssFiles[i])
          this.shadowRoot.appendChild(link)
        }
      }
    }
  }
)
