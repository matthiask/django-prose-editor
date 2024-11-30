window.__proseEditor = JSON.parse(document.currentScript.dataset.config)

const marker = "data-django-prose-editor"

function createEditor(textarea) {
  const config = JSON.parse(textarea.getAttribute(marker))
  textarea.removeAttribute(marker)

  const {
    extensionSets,
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
    createTextareaEditor,
  } = DjangoProseEditor

  const createIsTypeEnabled = (types) => (type) =>
    types?.length ? types.includes(type) : true
  const isTypeEnabled = createIsTypeEnabled(config.types)

  const extensions = [
    ...extensionSets.base,
    Menu.configure({ config }),
    NoSpellCheck,
    config.typographic && Typographic,
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
    (isTypeEnabled("bullet_list") || isTypeEnabled("ordered_list")) && ListItem,
    isTypeEnabled("ordered_list") && OrderedList,
    isTypeEnabled("strikethrough") && Strike,
    isTypeEnabled("sub") && Subscript,
    isTypeEnabled("sup") && Superscript,
    isTypeEnabled("underline") && Underline,
  ].filter(Boolean)

  return createTextareaEditor(textarea, extensions)
}

DjangoProseEditor.initializeEditors(createEditor, `[${marker}]`)
