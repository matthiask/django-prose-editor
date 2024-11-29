const config = JSON.parse(document.currentScript.dataset.config)
window.__proseEditor = config

import(config.editorJS).then((module) => {
  config.editor = module

  const marker = "data-django-prose-editor"

  function initializeEditor(container) {
    for (const el of container.querySelectorAll(`[${marker}]`)) {
      if (!el.id.includes("__prefix__")) {
        module.createEditor(el, JSON.parse(el.getAttribute(marker)))
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
