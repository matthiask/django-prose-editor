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

let _settings
export function settings() {
  if (!_settings) {
    _settings = JSON.parse(
      document.querySelector("#django-prose-editor-settings").textContent,
    )
  }
  return _settings
}
