import { getMarkRange } from "./extendMarkRange.mjs"
import { getHTML, parseHTML, trimmedRangeFromSelection } from "./utils.mjs"

const linkDialog = (attrs) => {
  const { messages } = window.DjangoProseEditor
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog class="prose-editor-dialog">
  <form>
  <p><label>${messages.url}</label> <input type="url" name="href" size="50" required></p>
  <p><label>${messages.title}</label> <input type="text" name="title" size="50"></p>
  <button type="submit">${messages.update}</button>
  <button type="button" value="cancel">${messages.cancel}</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")
    form.href.value = attrs.href || ""
    form.title.value = attrs.title || ""

    dialog
      .querySelector("button[value=cancel]")
      .addEventListener("click", () => {
        dialog.close()
      })
    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    div.querySelector("button[type=submit]").addEventListener("click", (e) => {
      e.preventDefault()
      if (form.reportValidity()) {
        div.remove()
        resolve(
          form.href.value
            ? { href: form.href.value, title: form.title.value }
            : null,
        )
      }
    })
    dialog.showModal()
  })
}

export const addLink = (state, dispatch) => {
  const { $from, empty } = state.selection
  const type = state.schema.marks.link

  if (empty && !type.isInSet($from.marks())) return false

  if (dispatch) {
    const mark = $from.marks().find((mark) => mark.type === type)
    linkDialog(mark?.attrs || {}).then((attrs) => {
      if (attrs) {
        let range
        if (empty) {
          range = getMarkRange($from, type)
          dispatch(
            state.tr
              .removeMark(range.from, range.to, type)
              .addMark(range.from, range.to, type.create(attrs)),
          )
        } else {
          const { from, to } = trimmedRangeFromSelection(state.selection)
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
  const { messages } = window.DjangoProseEditor
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog class="prose-editor-dialog">
  <form>
  <p><textarea name="html" cols="80" rows="30"></textarea></p>
  <button type="submit">${messages.update}</button>
  <button type="button" value="cancel">${messages.cancel}</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")
    form.html.value = html

    dialog
      .querySelector("button[value=cancel]")
      .addEventListener("click", () => {
        dialog.close()
      })
    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    div.querySelector("button[type=submit]").addEventListener("click", (e) => {
      e.preventDefault()
      if (form.reportValidity()) {
        div.remove()
        resolve(form.html.value)
      }
    })
    dialog.showModal()
  })
}

export const updateHTML = (state, dispatch) => {
  if (dispatch) {
    htmlDialog(getHTML(state)).then((html) => {
      if (html) {
        const doc = parseHTML(state.schema, html)
        dispatch(state.tr.replaceWith(0, state.tr.doc.content.size, doc))
      }
    })
  }
  return true
}

export const insertHorizontalRule = (state, dispatch) => {
  if (dispatch) {
    dispatch(
      state.tr.replaceSelectionWith(
        state.schema.nodes.horizontal_rule.create(),
      ),
    )
  }
  return true
}
