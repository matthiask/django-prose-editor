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

  // Code extensions
  Code,
  CodeBlock,

  // Text styling
  Color,
  Highlight,
  TextAlign,
  TextStyle,

  // Media and advanced extensions
  Image,
  Figure,
  Caption,

  // Tables
  Table,
  TableRow,
  TableHeader,
  TableCell,

  // Special extensions
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

// Extension instances indexed by their names
const EXTENSIONS = {
  // Extension classes are available directly by their class name
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

  // Code extensions
  Code,
  CodeBlock,

  // Text styling
  Color,
  Highlight,
  TextAlign,
  TextStyle,

  // Media and advanced extensions
  Image,
  Figure,
  Caption,

  // Tables
  Table,
  TableRow,
  TableHeader,
  TableCell,

  // Special extensions
  Link,
  HTML,
  NoSpellCheck,
  Typographic,
  Fullscreen,

  // UI
  Menu,
}

// Async function to dynamically import external modules in parallel
async function loadExtensionModules(moduleUrls) {
  if (!moduleUrls || !moduleUrls.length) return

  // Create an array of import promises for all modules
  const importPromises = moduleUrls.map(url =>
    import(url)
      .then(module => {
        // Return the module with its named exports
        return module
      })
      .catch(error => {
        console.error(`Error loading extension module from ${url}:`, error)
        return {} // Return empty object on error
      })
  )

  // Wait for all imports to complete in parallel
  const modules = await Promise.all(importPromises)

  // Merge all extension exports into the EXTENSIONS object
  for (const module of modules) {
    Object.assign(EXTENSIONS, module)
  }
}

async function createEditorAsync(textarea) {
  if (textarea.closest(".prose-editor")) return null

  // Get the extension configuration
  const extensions_config = JSON.parse(textarea.getAttribute(marker) || "{}")

  // Start with core extensions
  const extensionInstances = [...CORE_EXTENSIONS]

  // Check for custom JS modules
  const customModules = extensions_config._js_modules || []

  // Load custom extension modules - this will merge them directly into EXTENSIONS
  await loadExtensionModules(customModules)

  // Process all extensions from the config
  for (const [extensionName, config] of Object.entries(extensions_config)) {
    // Skip the _js_modules key which isn't an extension
    if (extensionName === '_js_modules') continue

    const extension = EXTENSIONS[extensionName]
    if (extension) {
      // If the extension has a configuration object (not empty), pass it to the extension
      if (typeof config === 'object' && config !== null && Object.keys(config).length > 0) {
        extensionInstances.push(extension.configure(config))
      } else {
        // Simple boolean flag, null, undefined, or empty object extensions use the default configuration
        extensionInstances.push(extension)
      }
    }
  }

  return createTextareaEditor(textarea, extensionInstances)
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
