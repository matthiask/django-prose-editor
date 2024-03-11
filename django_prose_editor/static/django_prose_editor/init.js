/* global DjangoProseEditor */
document.addEventListener("DOMContentLoaded", () => {
  for (let el of document.querySelectorAll("[data-django-prose-editor]")) {
    DjangoProseEditor.createEditor(el)
  }
})
