// Global counter to support unique IDs for dialog form elements
let dialogId = 0

export const crel = (tagName, attributes = null, children = []) => {
  const dom = document.createElement(tagName)
  dom.append(...children)
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (/^data-|^aria-|^role/.test(name)) dom.setAttribute(name, value)
      else dom[name] = value
    }
  }
  return dom
}

export const gettext = window.gettext || ((s) => s)

const formFieldForProperty = (name, config, attrValue, id) => {
  const label = crel("label", {
    htmlFor: id,
    textContent: config.title || name,
  })
  const defaultValue =
    typeof config.default === "function" ? config.default() : config.default
  const value = attrValue || defaultValue || ""
  let widget

  if (config.type === "boolean") {
    return crel("div", { className: "prose-editor-dialog-field" }, [
      crel("input", { id, name, type: "checkbox", checked: !!value }),
      label,
    ])
  }
  if (config.format === "textarea") {
    const textarea = crel("textarea", { id, name, value, cols: 80, rows: 3 })
    widget = crel(
      "div",
      { className: "prose-editor-grow-wrap", "data-value": textarea.value },
      [textarea],
    )
    textarea.addEventListener("input", () => {
      widget.dataset.value = textarea.value
    })
  } else if (config.enum) {
    widget = crel(
      "select",
      { id, name, value },
      config.enum.map((option) => crel("option", { textContent: option })),
    )
  } else {
    // Create input with appropriate attributes
    const attrs = {
      id,
      name,
      value,
      type: config.format || "text",
      size: 50,
    }

    // Add validation attributes if provided
    if (config.min !== undefined) attrs.min = config.min
    if (config.max !== undefined) attrs.max = config.max
    if (config.required) attrs.required = "required"

    widget = crel("input", attrs)
  }

  return crel("div", { className: "prose-editor-dialog-field" }, [
    label,
    widget,
  ])
}

const valueForFormField = (name, config, form) => {
  if (config.type === "boolean") {
    return !!form[name].checked
  }
  return form[name].value
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

      const prefix = `prose-editor-${++dialogId}-`

      // Add form fields with dynamic enum support
      formElements.push(
        ...Object.entries(properties).map(([name, config], idx) =>
          formFieldForProperty(name, config, attrs[name], `${prefix}${idx}`),
        ),
      )

      // Add buttons
      formElements.push(submit, cancel)

      const div = crel("div", {}, [
        crel("dialog", { className: "prose-editor-dialog" }, [
          crel("form", {}, formElements),
        ]),
      ])

      editor.view.dom.parentElement.append(div)
      const dialog = div.querySelector("dialog")
      const form = div.querySelector("form")

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
              Object.entries(properties).map(([name, config]) => [
                name,
                valueForFormField(name, config, form),
              ]),
            ),
          )
        }
      })
      dialog.showModal()
    })
  }
