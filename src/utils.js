import { DOMParser, DOMSerializer } from "prosemirror-model"
import debounce from "lodash-es/debounce"

export const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const crel = (tagName, attributes = null) => {
  const dom = document.createElement(tagName)
  if (attributes) {
    for (let [name, value] of Object.entries(attributes)) {
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

export function getHTML(editorViewInstance) {
  const { schema, doc } = editorViewInstance.state
  const serializer = DOMSerializer.fromSchema(schema)
  const container = crel("article")
  container.appendChild(serializer.serializeFragment(doc.content))
  return container.innerHTML
}

export const createDebouncedBackWriter = (
  schema,
  editorViewInstance,
  textarea
) => {
  const serializer = DOMSerializer.fromSchema(schema)
  const serialize = function () {
    const container = crel("article")
    container.appendChild(
      serializer.serializeFragment(editorViewInstance.state.doc.content)
    )
    return container.innerHTML
  }

  const writeBack = () => {
    const value = serialize()
    if (textarea.value !== value) {
      textarea.value = value
      textarea.dispatchEvent(
        new InputEvent("input", { bubbles: true, cancelable: true })
      )
    }
  }
  return debounce(writeBack, 250)
}

let _uniqueId = 1
export const uniqueId = () => {
  return ++_uniqueId
}

export const trimmedRangeFromSelection = (selection) => {
  // Copied from prosemirror-commands/src/commands.ts
  let { $from, $to } = selection
  let from = $from.pos,
    to = $to.pos,
    start = $from.nodeAfter,
    end = $to.nodeBefore
  let spaceStart = start && start.isText ? /^\s*/.exec(start.text)[0].length : 0
  let spaceEnd = end && end.isText ? /\s*$/.exec(end.text)[0].length : 0
  if (from + spaceStart < to) {
    from += spaceStart
    to -= spaceEnd
  }
  return { from, to }
}

export function findNode(node, predicate) {
  let found
  node.descendants((node, pos) => {
    if (!found && predicate(node)) found = { node, pos }
    if (found) return false
  })
  return found
}
