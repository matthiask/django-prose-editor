export const crel = (tagName, attributes = null, children = []) => {
  const dom = document.createElement(tagName)
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (/^data-|^aria-|^role/.test(name)) dom.setAttribute(name, value)
      else dom[name] = value
    }
  }
  dom.append(...children)
  return dom
}

export const gettext = window.gettext || ((s) => s)
