import { settings } from "./utils.js"

const formFieldForProperty = ([name, config]) => {
  let widget

  if (config.format === "textarea") {
    widget = `<textarea name="${name}" cols="80" rows="30"></textarea>`
  } else if (config.enum) {
    widget = `<select name="${name}">${config.enum.map((value) => `<option>${value}</option>`).join("")}</select>`
  } else {
    widget = `<input type="${config.format || "text"}" name="${name}" size="50">`
  }

  return `<p><label>${config.title || name}</label> ${widget}</p>`
}

export const updateAttrsDialog = (properties) => (editor, attrs) => {
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

    editor.view.dom.closest(".prose-editor").append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")

    for (const [name, config] of Object.entries(properties)) {
      form[name].value = attrs[name] || config.default || ""
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

export const htmlDialog = updateAttrsDialog({
  html: {
    type: "string",
    title: "HTML",
    format: "textarea",
  },
})
