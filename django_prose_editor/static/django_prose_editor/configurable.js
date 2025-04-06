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
  hardBreak: HardBreak,

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

// Async function to dynamically import external modules in parallel
async function loadExtensionModules(moduleUrls) {
  if (!moduleUrls || !moduleUrls.length) return []

  // Create an array of import promises for all modules
  const importPromises = moduleUrls.map(url =>
    import(url)
      .then(module => {
        const extensions = []

        // If the module exports a default extension, add it
        if (module.default) {
          extensions.push(module.default)
        }

        // If the module exports extensions, add them
        if (module.extensions && Array.isArray(module.extensions)) {
          extensions.push(...module.extensions)
        }

        return extensions
      })
      .catch(error => {
        console.error(`Error loading extension module from ${url}:`, error)
        return [] // Return empty array on error
      })
  )

  // Wait for all imports to complete in parallel
  const modulesArrays = await Promise.all(importPromises)

  // Flatten the array of arrays into a single array
  return modulesArrays.flat()
}

async function createEditorAsync(textarea) {
  if (textarea.closest(".prose-editor")) return null

  // Get the feature configuration
  const features = JSON.parse(textarea.getAttribute(marker) || "{}")

  // Start with core extensions
  const extensions = [...CORE_EXTENSIONS]

  // Check for custom JS modules
  const customModules = features._js_modules || []

  // Load custom extension modules
  const customExtensions = await loadExtensionModules(customModules)
  extensions.push(...customExtensions)

  // Process all features from the config
  for (const [feature, config] of Object.entries(features)) {
    const extension = EXTENSION_MAP[feature]
    if (extension) {
      // If the feature has a configuration object (not empty), pass it to the extension
      if (typeof config === 'object' && config !== null && Object.keys(config).length > 0) {
        extensions.push(extension.configure(config))
      } else {
        // Simple boolean flag, null, undefined, or empty object features use the default configuration
        extensions.push(extension)
      }
    }
  }

  return createTextareaEditor(textarea, extensions)
}

// Function for the initializeEditors callback
function createEditor(textarea) {
  // Start the async creation but don't await it here
  // The editor will be initialized asynchronously
  createEditorAsync(textarea).then(editor => {
    // The editor is initialized and ready to use
    if (editor) {
      // You could optionally emit an event or call a callback here
      // to notify other components that the editor is ready
      console.debug('Prose editor initialized with custom extensions')
    }
  }).catch(error => {
    console.error('Error initializing prose editor:', error)
  })

  // Return null since we're handling initialization asynchronously
  return null
}

initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)
