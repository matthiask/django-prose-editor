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
    // Create input with appropriate attributes
    const attrs = {
      name,
      type: config.format || "text",
      size: 50,
    }

    // Add validation attributes if provided
    if (config.min !== undefined) attrs.min = config.min
    if (config.max !== undefined) attrs.max = config.max
    if (config.required) attrs.required = "required"

    widget = crel("input", attrs)
  }

  return crel("p", {}, [
    crel("label", { textContent: config.title || name }),
    widget,
  ])
}

export const updateAttrsDialog =
  (properties, options = {}) =>
  (editor, attrs) => {
    return new Promise((resolve) => {
      const submit = crel("button", {
        type: "submit",
        textContent: options.submitText || gettext("Update"),
      })
      const cancel = crel("button", {
        type: "button",
        value: "cancel",
        textContent: gettext("Cancel"),
      })

      // Create form elements
      const formElements = []

      // Add title if provided
      if (options.title) {
        formElements.push(
          crel("h3", {
            className: "prose-editor-dialog-title",
            textContent: options.title,
          }),
        )
      }

      // Add form fields with dynamic enum support
      formElements.push(
        ...Object.entries(properties).map((entry) =>
          formFieldForProperty(entry),
        ),
      )

      // Add buttons
      formElements.push(submit, cancel)

      const div = crel("div", {}, [
        crel("dialog", { className: "prose-editor-dialog" }, [
          crel("form", {}, formElements),
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
