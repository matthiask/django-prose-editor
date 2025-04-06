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

const marker = "data-django-prose-editor-configurable"

// Core extensions that are always included
const CORE_EXTENSIONS = [
  Document,
  Dropcursor,
  Gapcursor,
  Paragraph,
  HardBreak,
  Text,
  Menu,
  NoSpellCheck,
]

// Map of feature names to their extensions
const EXTENSION_MAP = {
  // Basic formatting
  bold: Bold,
  italic: Italic,
  strike: Strike,
  underline: Underline,
  subscript: Subscript,
  superscript: Superscript,

  // Structure
  blockquote: Blockquote,
  heading: Heading,
  horizontalRule: HorizontalRule,
  bulletList: BulletList,
  orderedList: OrderedList,
  listItem: ListItem,

  // Other features
  link: Link,
  history: History,
  html: HTML,
  typographic: Typographic,

  // Tables
  table: Table,
  tableRow: TableRow,
  tableHeader: TableHeader,
  tableCell: TableCell,
}

function createEditor(textarea) {
  if (textarea.closest(".prose-editor")) return

  // Get the feature configuration
  const features = JSON.parse(textarea.getAttribute(marker) || "{}")

  // Start with core extensions
  const extensions = [...CORE_EXTENSIONS]

  // Get all enabled features
  const enabledFeatures = Object.entries(features)
    // Ignore special keys
    .filter(([feature]) => !["preset", "profile", "types"].includes(feature))
    // Filter out disabled features
    .filter(([_, config]) => config !== false && config !== null && config !== undefined)

  // Process all enabled features
  for (const [feature, config] of enabledFeatures) {
    const extension = EXTENSION_MAP[feature]
    if (extension) {
      // If the feature has a configuration object, pass it directly to the extension
      if (config && typeof config === 'object') {
        extensions.push(extension.configure(config))
      } else {
        // Simple boolean flag features just use the default configuration
        extensions.push(extension)
      }
    }
  }

  return createTextareaEditor(textarea, extensions)
}

initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)
