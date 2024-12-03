import { getHTML, parseHTML, settings } from "./utils.js"

const formFieldForProperty = ([name, config]) => {
  if (config.format === "textarea") {
    return `<p><label>${config.title || name}</label> <textarea name="${name}" cols="80" rows="30"></textarea></p>`
  }
  return `<p><label>${config.title || name}</label> <input type="${config.format || "text"}" name="${name}" size="50"></p>`
}

export const updateAttrsDialog = (properties) => (attrs) => {
  const { messages } = settings()
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.innerHTML = `
  <dialog class="prose-editor-dialog">
  <form>
  ${Object.entries(properties).map(formFieldForProperty).join("")}
  <button type="submit">${messages.update}</button>
  <button type="button" value="cancel">${messages.cancel}</button>
  </form>
  </dialog>
  `
    document.body.append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")

    for (const name of Object.keys(properties)) {
      form[name].value = attrs[name] || ""
    }

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
          Object.fromEntries(
            Object.keys(properties).map((name) => [name, form[name].value]),
          ),
        )
      }
    })
    dialog.showModal()
  })
}

export const linkDialog = updateAttrsDialog({
  href: {
    type: "string",
    title: settings().messages.url,
  },
  title: {
    type: "string",
    title: settings().messages.title,
  },
})

const htmlDialog = updateAttrsDialog({
  html: {
    type: "string",
    title: "HTML",
    format: "textarea",
  },
})

export const updateHTML = (state, dispatch) => {
  if (dispatch) {
    htmlDialog({ html: getHTML(state) }).then((attrs) => {
      if (attrs) {
        const doc = parseHTML(state.schema, attrs.html)
        dispatch(state.tr.replaceWith(0, state.tr.doc.content.size, doc))
      }
    })
  }
  return true
}
