import { DOMParser, DOMSerializer } from "@tiptap/pm/model"

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

export function parseHTML(schema, html) {
  const container = document.createElement("article")
  container.innerHTML = html
  return DOMParser.fromSchema(schema).parse(container)
}

export function getHTML(state) {
  const { schema, doc } = state
  const serializer = DOMSerializer.fromSchema(schema)
  const container = crel("article")
  container.appendChild(serializer.serializeFragment(doc.content))
  return container.innerHTML
}

export const trimmedRangeFromSelection = (selection) => {
  // Copied from prosemirror-commands/src/commands.ts
  const { $from, $to } = selection
  let from = $from.pos
  let to = $to.pos
  const start = $from.nodeAfter
  const end = $to.nodeBefore
  const spaceStart = start?.isText ? /^\s*/.exec(start.text)[0].length : 0
  const spaceEnd = end?.isText ? /\s*$/.exec(end.text)[0].length : 0
  if (from + spaceStart < to) {
    from += spaceStart
    to -= spaceEnd
  }
  return { from, to }
}

export function markActive(state, type) {
  const { from, $from, to, empty } = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, type)
}

export function settings() {
  const el = document.querySelector("#django-prose-editor-settings")
  return el ? JSON.parse(el.textContent) : {}
}
