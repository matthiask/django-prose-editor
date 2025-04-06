import {
  Document,
  Dropcursor,
  Gapcursor,
  Paragraph,
  HardBreak,
  Text,
  History,

  // Block nodes
  Blockquote,
  Bold,
  BulletList,
  Heading,
  HorizontalRule,
  ListItem,
  OrderedList,

  // Text formatting
  Italic,
  Strike,
  Subscript,
  Superscript,
  Underline,

  // Code features
  Code,
  CodeBlock,

  // Text styling
  Color,
  Highlight,
  TextAlign,
  TextStyle,

  // Media and advanced features
  Image,
  Figure,
  Caption,

  // Tables
  Table,
  TableRow,
  TableHeader,
  TableCell,

  // Special features
  Link,
  HTML,
  NoSpellCheck,
  Typographic,
  Fullscreen,

  // UI
  Menu,

  // Core utilities
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
  // Text formatting
  bold: Bold,
  italic: Italic,
  strike: Strike,
  underline: Underline,
  subscript: Subscript,
  superscript: Superscript,

  // Code features
  code: Code,
  codeBlock: CodeBlock,

  // Text styling
  color: Color,
  highlight: Highlight,
  textAlign: TextAlign,
  textStyle: TextStyle,

  // Structure
  blockquote: Blockquote,
  heading: Heading,
  horizontalRule: HorizontalRule,
  bulletList: BulletList,
  orderedList: OrderedList,
  listItem: ListItem,

  // Media and figures
  image: Image,
  figure: Figure,
  caption: Caption,

  // Tables
  table: Table,
  tableRow: TableRow,
  tableHeader: TableHeader,
  tableCell: TableCell,

  // Special features
  link: Link,
  history: History,
  html: HTML,
  typographic: Typographic,
  fullscreen: Fullscreen,
  nospellcheck: NoSpellCheck,
}

function createEditor(textarea) {
  if (textarea.closest(".prose-editor")) return

  // Get the feature configuration
  const features = JSON.parse(textarea.getAttribute(marker) || "{}")

  // Start with core extensions
  const extensions = [...CORE_EXTENSIONS]

  // All features from Python are already filtered
  // and only enabled features are passed
  const enabledFeatures = Object.entries(features)
    // Ignore special keys that should be handled separately
    .filter(([feature]) => !["preset", "types"].includes(feature))

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
