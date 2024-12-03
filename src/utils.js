export const crel = (tagName, attributes = null) => {
  const dom = document.createElement(tagName)
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (/^data-|^aria-|^role/.test(name)) dom.setAttribute(name, value)
      else dom[name] = value
    }
  }
  return dom
}

export function settings() {
  const el = document.querySelector("#django-prose-editor-settings")
  return el ? JSON.parse(el.textContent) : {}
}
