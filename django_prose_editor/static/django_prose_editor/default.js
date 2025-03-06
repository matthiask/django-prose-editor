import {
  Document,
  Dropcursor,
  Gapcursor,
  Paragraph,
  HardBreak,
  Text,
  History,
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
  HTML,
  NoSpellCheck,
  Typographic,
  createTextareaEditor,
  initializeEditors,
} from "django-prose-editor/editor"

const marker = "data-django-prose-editor-default"

function createEditor(textarea, config = null) {
  if (textarea.closest(".prose-editor")) return

  if (!config) {
    config = JSON.parse(textarea.getAttribute(marker))
  }

  const createIsTypeEnabled = (types) => (type) =>
    types?.length ? types.includes(type) : true
  const isTypeEnabled = createIsTypeEnabled(config.types)

  const extensions = [
    Document,
    Dropcursor,
    Gapcursor,
    Paragraph,
    HardBreak,
    Text,
    config.history && History,
    Menu,
    config.html && HTML,
    NoSpellCheck,
    config.typographic && Typographic,
    // Nodes and marks
    isTypeEnabled("blockquote") && Blockquote,
    isTypeEnabled("strong") && Bold,
    isTypeEnabled("bullet_list") && BulletList,
    isTypeEnabled("heading") &&
      Heading.configure({ levels: config.headingLevels || [1, 2, 3, 4, 5] }),
    isTypeEnabled("horizontal_rule") && HorizontalRule,
    isTypeEnabled("em") && Italic,
    isTypeEnabled("link") && Link,
    (isTypeEnabled("bullet_list") || isTypeEnabled("ordered_list")) && ListItem,
    isTypeEnabled("ordered_list") && OrderedList,
    isTypeEnabled("strikethrough") && Strike,
    isTypeEnabled("sub") && Subscript,
    isTypeEnabled("sup") && Superscript,
    isTypeEnabled("underline") && Underline,
  ].filter(Boolean)

  return createTextareaEditor(textarea, extensions)
}

initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)

// Backwards compatibility shim for django-prose-editor < 0.10
window.DjangoProseEditor = { createEditor }
