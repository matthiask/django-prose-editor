import { Mark, mergeAttributes } from "@tiptap/core"
import { crel } from "./utils.js"

const cssClass = (c) => (typeof c === "string" ? { className: c, title: c } : c)
const isValidClass = (cssClasses, className) =>
  cssClasses.find((c) => cssClass(c).className === className)

export const TextClass = Mark.create({
  name: "textClass",
  priority: 101, // Slightly higher priority so that e.g. strong doesn't split text class marks

  addOptions() {
    return {
      HTMLAttributes: {},
      cssClasses: [],
    }
  },

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => {
          const className = element.className?.trim()
          if (!className) return null

          return isValidClass(this.options.cssClasses, className)
            ? className
            : null
        },
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {}
          }

          return {
            class: attributes.class,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span",
        consuming: false,
        getAttrs: (element) => {
          const className = element.className?.trim()
          if (!className) return false

          return isValidClass(this.options.cssClasses, className) ? {} : false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ]
  },

  addCommands() {
    return {
      setTextClass:
        (className) =>
        ({ commands }) => {
          if (!isValidClass(this.options.cssClasses, className)) {
            return false
          }
          return commands.setMark(this.name, { class: className })
        },
      unsetTextClass:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name, { extendEmptyMarkRange: true })
        },
    }
  },

  addMenuItems({ buttons, menu }) {
    if (this.options.cssClasses.length === 0) {
      return
    }

    for (const { className, title } of [
      "default",
      ...this.options.cssClasses,
    ].map(cssClass)) {
      menu.defineItem({
        name: `${this.name}:${className}`,
        groups: this.name,
        button: buttons.text(title),
        option: crel("p", { className, textContent: title }),
        active(editor) {
          return className === "default"
            ? !editor.isActive("textClass")
            : editor.isActive("textClass", { class: className })
        },
        command(editor) {
          if (className === "default") {
            editor.chain().focus().unsetTextClass().run()
          } else {
            editor.chain().focus().setTextClass(className).run()
          }
        },
      })
    }
  },
})
