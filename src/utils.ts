import type { Editor } from "@tiptap/core"

type GettextFunction = (s: string) => string

// Configuration for form fields - values can come from JSON/user input
// so they need to be flexible and handle string/number conversion
interface PropertyConfig {
  title?: string
  default?: unknown | (() => unknown)
  type?: string
  format?: string
  enum?: string[]
  min?: unknown // Could be number, string, or undefined
  max?: unknown // Could be number, string, or undefined
  required?: unknown // Could be boolean, string, or undefined
}

interface DialogOptions {
  title?: string
  submitText?: string
}

// Accept any properties that can be assigned to DOM elements
// This covers HTML attributes, data-*, aria-*, and element properties
type CrelAttributes = Record<string, unknown>

// Global counter to support unique IDs for dialog form elements
let dialogId = 0

export const crel = (
  tagName: string,
  attributes: CrelAttributes | null = null,
  children: (HTMLElement | string)[] = [],
): HTMLElement => {
  const dom = document.createElement(tagName)
  dom.append(...children)
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (/^data-|^aria-|^role/.test(name)) {
        dom.setAttribute(name, String(value))
      } else {
        ;(dom as any)[name] = value
      }
    }
  }
  return dom
}

export const gettext: GettextFunction =
  (window as any).gettext || ((s: string) => s)

const formFieldForProperty = (
  name: string,
  config: PropertyConfig,
  attrValue: unknown,
  id: string,
): HTMLElement => {
  const label = crel("label", {
    htmlFor: id,
    textContent: config.title || name,
  })
  const defaultValue =
    typeof config.default === "function" ? config.default() : config.default
  const value = attrValue || defaultValue || ""
  let widget: HTMLElement

  if (config.type === "boolean") {
    return crel("div", { className: "prose-editor-dialog-field" }, [
      crel("input", { id, name, type: "checkbox", checked: !!value }),
      label,
    ])
  }
  if (config.format === "textarea") {
    const textarea = crel("textarea", {
      id,
      name,
      value: String(value),
      cols: 80,
      rows: 3,
    }) as HTMLTextAreaElement
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
      { id, name, value: String(value) },
      config.enum.map((option) => crel("option", { textContent: option })),
    )
  } else {
    // Create input with appropriate attributes
    const attrs: CrelAttributes = {
      id,
      name,
      value: String(value),
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

const valueForFormField = (
  name: string,
  config: PropertyConfig,
  form: HTMLFormElement,
): unknown => {
  const element = form[name as any] as HTMLInputElement
  if (config.type === "boolean") {
    return !!element.checked
  }
  return element.value
}

export const updateAttrsDialog =
  (properties: Record<string, PropertyConfig>, options: DialogOptions = {}) =>
  (
    editor: Editor,
    attrs: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> => {
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
      const formElements: HTMLElement[] = []

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

      editor.view.dom.parentElement?.append(div)
      const dialog = div.querySelector("dialog")!
      const form = div.querySelector("form")! as HTMLFormElement

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
