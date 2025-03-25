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
  TableCell,
  TableHeader,
  TableRow,
  createTextareaEditor,
  initializeEditors,
  gettext,
  updateAttrsDialog,
} from "django-prose-editor/editor"

const marker = "data-django-prose-editor-table"

// Initialize editor with all extensions
function createEditor(textarea) {
  if (textarea.closest(".prose-editor")) return

  const extensions = [
    // Core extensions
    Document,
    Dropcursor,
    Gapcursor,
    Paragraph,
    HardBreak,
    Text,
    History,
    Menu,
    HTML,
    NoSpellCheck,
    Typographic,

    // Formatting extensions
    Blockquote,
    Bold,
    BulletList,
    Heading.configure({ levels: [1, 2, 3, 4, 5] }),
    HorizontalRule,
    Italic,
    Link,
    ListItem,
    OrderedList,
    Strike,
    Subscript,
    Superscript,
    Underline,

    // Table extensions
    Table,
    TableCell,
    TableHeader,
    TableRow,
  ]

  return createTextareaEditor(textarea, extensions)
}

// Initialize all editors with the table marker
initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)
