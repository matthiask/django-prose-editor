import { crel, settings } from "./utils.js"

const formFieldForProperty = ([name, config]) => {
  let widget

  if (config.format === "textarea") {
    widget = crel("textarea", { name, cols: 80, rows: 30 })
  } else if (config.enum) {
    widget = crel(
      "select",
      { name },
      config.enum.map((value) => crel("option", { textContent: value })),
    )
  } else {
    widget = crel("input", { name, type: config.format || "text", size: 50 })
  }

  return crel("p", {}, [
    crel("label", { textContent: config.title || name }),
    widget,
  ])
}

export const updateAttrsDialog = (properties) => (editor, attrs) => {
  const { messages } = settings()
  return new Promise((resolve) => {
    const submit = crel("button", {
      type: "submit",
      textContent: messages.update,
    })
    const cancel = crel("button", {
      type: "button",
      value: "cancel",
      textContent: messages.cancel,
    })

    const div = crel("div", {}, [
      crel("dialog", { className: "prose-editor-dialog" }, [
        crel("form", {}, [
          ...Object.entries(properties).map(formFieldForProperty),
          submit,
          cancel,
        ]),
      ]),
    ])

    editor.view.dom.closest(".prose-editor").append(div)
    const dialog = div.querySelector("dialog")
    const form = div.querySelector("form")

    for (const [name, config] of Object.entries(properties)) {
      form[name].value = attrs[name] || config.default || ""
    }

    cancel.addEventListener("click", () => {
      dialog.close()
    })
    dialog.addEventListener("close", () => {
      div.remove()
      resolve(null)
    })
    submit.addEventListener("click", (e) => {
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
