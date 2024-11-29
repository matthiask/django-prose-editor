const config = JSON.parse(document.currentScript.dataset.config)
window.__proseEditor = config

function createEditor(library, textarea, config) {
  const {
    Editor,
    extensions,
    Blockquote,
    Bold,
    BulletList,
    Heading,
    HorizontalRule,
    Italic,
    ListItem,
    OrderedList,
    Strike,
    Subscript,
    Superscript,
    Underline,
    Link,
    Menu,
    NoSpellCheck,
    Typographic,
    crel,
  } = library

  const createIsTypeEnabled = (types) => (type) =>
    types?.length ? types.includes(type) : true

  const editor = crel("div", { className: "prose-editor" })
  textarea.before(editor)
  editor.append(textarea)

  const isTypeEnabled = createIsTypeEnabled(config.types)

  const editorInstance = new Editor({
    element: editor,
    editable: !textarea.hasAttribute("disabled"),
    extensions: [
      ...extensions.base,
      // Nodes and marks
      isTypeEnabled("blockquote") && Blockquote,
      isTypeEnabled("strong") && Bold,
      isTypeEnabled("bullet_list") && BulletList,
      isTypeEnabled("heading") && Heading,
      isTypeEnabled("horizontal_rule") && HorizontalRule,
      isTypeEnabled("em") && Italic,
      isTypeEnabled("link") &&
        Link.configure({
          openOnClick: false,
        }),
      (isTypeEnabled("bullet_list") || isTypeEnabled("ordered_list")) &&
        ListItem,
      isTypeEnabled("ordered_list") && OrderedList,
      isTypeEnabled("strikethrough") && Strike,
      isTypeEnabled("sub") && Subscript,
      isTypeEnabled("sup") && Superscript,
      isTypeEnabled("underline") && Underline,
      // Other extensions
      Menu.configure({ config }),
      NoSpellCheck,
      config.typographic ? Typographic : null,
    ].filter(Boolean),
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML()
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    },
    onDestroy() {
      editor.replaceWith(textarea)
    },
  })

  return () => {
    editorInstance.destroy()
  }
}

import(config.editorJS).then((module) => {
  config.editor = module

  const marker = "data-django-prose-editor"

  function initializeEditor(container) {
    for (const el of container.querySelectorAll(`[${marker}]`)) {
      if (!el.id.includes("__prefix__")) {
        createEditor(module, el, JSON.parse(el.getAttribute(marker)))
        el.removeAttribute(marker)
      }
    }
  }

  function initializeInlines() {
    let o
    if ((o = window.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e) => {
        initializeEditor(e.target)
      })
    }
  }

  initializeEditor(document)
  initializeInlines()
})
