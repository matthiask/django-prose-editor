// Thanks, tiptap
import { TextSelection } from "prosemirror-state"

function objectIncludes(object1, object2) {
  const keys = Object.keys(object2)

  if (!keys.length) {
    return true
  }

  return !!keys.filter((key) => object2[key] === object1[key]).length
}

function findMarkInSet(marks, type, attributes = {}) {
  return marks.find((item) => {
    return item.type === type && objectIncludes(item.attrs, attributes)
  })
}

function isMarkInSet(marks, type, attributes = {}) {
  return !!findMarkInSet(marks, type, attributes)
}

export function getMarkRange($pos, type, attributes = {}) {
  if (!$pos || !type) {
    return
  }

  const start = $pos.parent.childAfter($pos.parentOffset)

  if (!start.node) {
    return
  }

  const mark = findMarkInSet(start.node.marks, type, attributes)

  if (!mark) {
    return
  }

  let startIndex = $pos.index()
  let startPos = $pos.start() + start.offset
  let endIndex = startIndex + 1
  let endPos = startPos + start.node.nodeSize

  findMarkInSet(start.node.marks, type, attributes)

  while (
    startIndex > 0 &&
    mark.isInSet($pos.parent.child(startIndex - 1).marks)
  ) {
    startIndex -= 1
    startPos -= $pos.parent.child(startIndex).nodeSize
  }

  while (
    endIndex < $pos.parent.childCount &&
    isMarkInSet($pos.parent.child(endIndex).marks, type, attributes)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize
    endIndex += 1
  }

  return {
    from: startPos,
    to: endPos,
  }
}

export const extendMarkRange =
  (type, attributes = {}) =>
  (state, dispatch) => {
    const { doc } = state
    const { $from, from, to } = state.selection

    if (dispatch) {
      const range = getMarkRange($from, type, attributes)

      if (range && range.from <= from && range.to >= to) {
        const newSelection = TextSelection.create(doc, range.from, range.to)

        dispatch(state.tr.setSelection(newSelection))
      }
    }

    return true
  }
