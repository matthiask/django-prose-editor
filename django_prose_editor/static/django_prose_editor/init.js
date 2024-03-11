/* global DjangoProseEditor */

const marker = "data-django-prose-editor"

function initializeDjangoProseEditor(container) {
  for (let el of container.querySelectorAll(`[${marker}]`)) {
    if (!el.id.includes("__prefix__")) {
      DjangoProseEditor.createEditor(el)
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

document.addEventListener("DOMContentLoaded", () => {
  initializeDjangoProseEditor(document)
  initializeDjangoInlines()
})
