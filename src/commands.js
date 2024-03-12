import { getMarkRange } from "./extendMarkRange.js"
import { getHTML, parseHTML, trimmedRangeFromSelection } from "./utils.js"

const linkDialog = (attrs) => {
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog>
  <form>
  <p><label>URL</label> <input type="url" name="href"></p>
  <p><label>Titel</label> <input type="text" name="title"></p>
  <button type="submit">Speichern</button>
  <button value="cancel" formmethod="dialog">Abbrechen</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")
    form.href.value = attrs.href || ""
    form.title.value = attrs.title || ""

    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    div.querySelector("button[type=submit]").addEventListener("click", (e) => {
      e.preventDefault()
      div.remove()
      resolve(
        form.href.value
          ? { href: form.href.value, title: form.title.value }
          : null
      )
    })
    dialog.showModal()
  })
}

export const addLink = (state, dispatch) => {
  const { $from, empty } = state.selection
  const type = state.schema.marks.link

  if (empty && !type.isInSet($from.marks())) return false

  if (dispatch) {
    let mark = $from.marks().find((mark) => mark.type === type)
    linkDialog(mark?.attrs || {}).then((attrs) => {
      if (attrs) {
        let range
        if (empty) {
          // TODO if two links are directly besides each other this probably
          // removes both of them. We should pass the current mark's attributes
          // to getMarkRange.
          range = getMarkRange($from, type)
          dispatch(
            state.tr
              .removeMark(range.from, range.to, type)
              .addMark(range.from, range.to, type.create(attrs))
          )
        } else {
          let { from, to } = trimmedRangeFromSelection(state.selection)
          dispatch(state.tr.addMark(from, to, type.create(attrs)))
        }
      }
    })
  }
  return true
}

export const removeLink = (state, dispatch) => {
  const type = state.schema.marks.link
  const { $from, from, to } = state.selection
  const range = getMarkRange($from, type)
  if (range && range.from <= from && range.to >= to) {
    if (dispatch) {
      dispatch(state.tr.removeMark(range.from, range.to, type))
    }
    return true
  }
  return false
}

const htmlDialog = (html) => {
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog>
  <form>
  <p><textarea name="html" cols="80" rows="30"></textarea></p>
  <button type="submit">Speichern</button>
  <button value="cancel" formmethod="dialog">Abbrechen</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")
    form.html.value = html

    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    div.querySelector("button[type=submit]").addEventListener("click", (e) => {
      e.preventDefault()
      div.remove()
      resolve(form.html.value)
    })
    dialog.showModal()
  })
}

export const updateHTML = (editorViewInstance) => (state, dispatch) => {
  if (dispatch) {
    htmlDialog(getHTML(editorViewInstance)).then((html) => {
      if (html) {
        const doc = parseHTML(editorViewInstance.state.schema, html)
        dispatch(state.tr.replaceWith(0, state.tr.doc.content.size, doc))
      }
    })
  }
  return true
}

export const insertHorizontalRule = (state, dispatch) => {
  if (dispatch) {
    dispatch(
      state.tr.replaceSelectionWith(state.schema.nodes.horizontal_rule.create())
    )
  }
  return true
}
