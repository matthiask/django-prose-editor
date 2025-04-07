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

// Extension instances indexed by their names
const EXTENSIONS = {
  // Extension classes are available directly by their class name
  Document,
  Paragraph,
  Text,
  HardBreak,
  History,
  Dropcursor,
  Gapcursor,

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

// Cache for module loading promises to avoid duplicate loading
const moduleCache = new Map()

// Async function to dynamically import external modules in parallel
async function loadExtensionModules(moduleUrls) {
  if (!moduleUrls || !moduleUrls.length) return

  // Create a batch of promises for all requested modules
  const loadPromises = moduleUrls.map(url => {
    // If we already have this module or its loading promise in cache, return it
    if (moduleCache.has(url)) {
      return moduleCache.get(url)
    }

    // Create a new loading promise for this module
    const loadPromise = import(url)
      .then(module => {
        // Register the loaded module
        Object.assign(EXTENSIONS, module)
        return module
      })
      .catch(error => {
        console.error(`Error loading extension module from ${url}:`, error)
        // Remove failed modules from cache
        moduleCache.delete(url)
        return {}
      })

    // Store the promise in the cache
    moduleCache.set(url, loadPromise)
    return loadPromise
  })

  // Wait for all modules to load
  await Promise.all(loadPromises)
}

async function createEditorAsync(textarea) {
  if (textarea.closest(".prose-editor")) return null

  // Get the extension configuration
  const config = JSON.parse(textarea.getAttribute(marker) || "{}")

  const extensionInstances = []

  // Check for custom JS modules
  const customModules = config.js_modules || []

  // Load custom extension modules - this will merge them directly into EXTENSIONS
  await loadExtensionModules(customModules)

  // Process all extensions from the config
  for (const [extensionName, extensionConfig] of Object.entries(config.extensions)) {
    const extension = EXTENSIONS[extensionName]
    if (extension) {
      // If the extension has a configuration object (not empty), pass it to the extension
      if (typeof extensionConfig === 'object') {
        extensionInstances.push(extension.configure(extensionConfig))
      } else {
        extensionInstances.push(extension)
      }
    }
  }

  return createTextareaEditor(textarea, extensionInstances)
}

// Track pending editor initializations
const pendingEditors = new WeakMap()

// Function for the initializeEditors callback
function createEditor(textarea) {
  // Check if we already have a pending initialization for this textarea
  if (pendingEditors.has(textarea)) {
    return null
  }

  // Create a promise for the editor initialization
  const editorPromise = createEditorAsync(textarea)
    .then(editor => {
      // The editor is initialized and ready to use
      if (editor) {
        console.debug('Prose editor initialized with custom extensions')

        // Dispatch an event for other components to know when the editor is ready
        const event = new CustomEvent('prose-editor:ready', {
          detail: { editor, textarea },
          bubbles: true
        })
        textarea.dispatchEvent(event)
      }
      // Remove from pending tracking once complete
      pendingEditors.delete(textarea)
      return editor
    })
    .catch(error => {
      console.error('Error initializing prose editor:', error)
      // Remove from pending tracking on error
      pendingEditors.delete(textarea)
      return null
    })

  // Track this pending initialization
  pendingEditors.set(textarea, editorPromise)

  // Return the promise
  return editorPromise
}

// Allow other components to get the editor promise
function getEditorPromise(textarea) {
  return pendingEditors.get(textarea) || null
}

// Initialize all editors with the configurable marker
initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)

// Export utility functions for external use
export {
  createEditor,
  getEditorPromise
}
