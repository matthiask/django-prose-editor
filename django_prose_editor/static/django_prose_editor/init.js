const config = document.currentScript.dataset

import(config.editorJs).then((DjangoProseEditor) => {
  DjangoProseEditor.messages = JSON.parse(config.messages)

  const marker = "data-django-prose-editor"

  function initializeDjangoProseEditor(container) {
    for (const el of container.querySelectorAll(`[${marker}]`)) {
      if (!el.id.includes("__prefix__")) {
        DjangoProseEditor.createEditor(el, JSON.parse(el.getAttribute(marker)))
        el.removeAttribute(marker)
      }
    }
  }

  function initializeDjangoInlines() {
    let o
    if ((o = window.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e) => {
        initializeDjangoProseEditor(e.target)
      })
    }
  }

  initializeDjangoProseEditor(document)
  initializeDjangoInlines()
})
