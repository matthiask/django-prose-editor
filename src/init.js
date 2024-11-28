const config = document.currentScript.dataset
window.__proseEditor = {
  messages: JSON.parse(config.messages),
}

import(config.editorJs).then((editorJs) => {
  Object.assign(window.__proseEditor, editorJs)

  const marker = "data-django-prose-editor"

  function initializeEditor(container) {
    for (const el of container.querySelectorAll(`[${marker}]`)) {
      if (!el.id.includes("__prefix__")) {
        editorJs.createEditor(el, JSON.parse(el.getAttribute(marker)))
        el.removeAttribute(marker)
      }
    }
  }

  function initializeInlines() {
    let o
    if ((o = window.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e) => {
        initializeEditor(e.target)
      })
    }
  }

  initializeEditor(document)
  initializeInlines()
})
