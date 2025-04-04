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
  Table,
  TableRow,
  TableHeader,
  TableCell,
  createTextareaEditor,
  initializeEditors,
} from "django-prose-editor/editor"

const marker = "data-django-prose-editor-default"

function createEditor(textarea, config = null) {
  if (textarea.closest(".prose-editor")) return

  if (!config) {
    config = JSON.parse(textarea.getAttribute(marker))
  }

  // Map of deprecated names to their new versions
  const pmToTiptap = {
    // Node names
    "bullet_list": "bulletList",
    "horizontal_rule": "horizontalRule",
    "list_item": "listItem",
    "ordered_list": "orderedList",
    "hard_break": "hardBreak",
    // Mark names
    "strong": "bold",
    "em": "italic",
    "strikethrough": "strike",
    "sub": "subscript",
    "sup": "superscript"
  }

  // Check if any deprecated names are being used and log warnings
  if (config.types?.length) {
    const oldTypes = []
    const newTypes = []

    config.types.forEach(type => {
      if (pmToTiptap[type]) {
        oldTypes.push(type)
        newTypes.push(pmToTiptap[type])
      }
    })

    if (oldTypes.length) {
      console.warn(
        `[django-prose-editor] Deprecated extension names were found in the configuration: ${oldTypes.join(", ")}. ` +
        `Convert them to their new names: ${newTypes.join(", ")}.`
      )
    }
  }

  // Default extension types (table explicitly excluded)
  const DEFAULT_TYPES = [
    "blockquote", "bold", "bulletList", "heading", "horizontalRule",
    "italic", "link", "orderedList", "strike", "subscript",
    "superscript", "underline"
  ]

  const createIsTypeEnabled = (enabledTypes) => (...types) => {
    // If no types defined, use the defaults
    const typesToCheck = enabledTypes?.length ? enabledTypes : DEFAULT_TYPES
    return !!types.find((t) => typesToCheck.includes(t))
  }
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
    isTypeEnabled("bold", "strong") && Bold,
    isTypeEnabled("bulletList", "bullet_list") && BulletList,
    isTypeEnabled("heading") &&
      Heading.configure({ levels: config.headingLevels || [1, 2, 3, 4, 5] }),
    isTypeEnabled("horizontalRule", "horizontal_rule") && HorizontalRule,
    isTypeEnabled("italic", "em") && Italic,
    isTypeEnabled("link") && Link,
    isTypeEnabled("bulletList", "bullet_list", "orderedList", "ordered_list") && ListItem,
    isTypeEnabled("orderedList", "ordered_list") && OrderedList,
    isTypeEnabled("strike", "strikethrough") && Strike,
    isTypeEnabled("subscript", "sub") && Subscript,
    isTypeEnabled("superscript", "sup") && Superscript,
    isTypeEnabled("underline") && Underline,
    // Table support
    isTypeEnabled("table") && Table,
    isTypeEnabled("table") && TableRow,
    isTypeEnabled("table") && TableHeader,
    isTypeEnabled("table") && TableCell,
  ].filter(Boolean)

  return createTextareaEditor(textarea, extensions)
}

initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)

// Backwards compatibility shim for django-prose-editor < 0.10
window.DjangoProseEditor = { createEditor }
