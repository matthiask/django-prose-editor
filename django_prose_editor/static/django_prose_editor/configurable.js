import * as editorModule from "django-prose-editor/editor"
import { createTextareaEditor, initializeEditors } from "django-prose-editor/editor"

const marker = "data-django-prose-editor-configurable"

const EXTENSIONS = { ...editorModule }

const moduleLoadPromises = new Map()

/**
 * Load extension modules from URLs
 * @param {Array} moduleUrls - List of URLs to load modules from
 * @returns {Promise} - Promise that resolves when all modules are loaded
 */
async function loadExtensionModules(moduleUrls) {
  if (!moduleUrls || !moduleUrls.length) return

  const loadPromises = moduleUrls.map(url => {
    if (moduleLoadPromises.has(url)) {
      return moduleLoadPromises.get(url)
    }

    const loadPromise = import(url)
      .then(module => {
        Object.assign(EXTENSIONS, module)
      })
      .catch(error => {
        console.error(`Error loading extension module from ${url}:`, error)
        // Remove failed modules from cache
        moduleLoadPromises.delete(url)
      })

    moduleLoadPromises.set(url, loadPromise)
    return loadPromise
  })

  // Wait for all modules to load
  await Promise.all(loadPromises)
}

/**
 * Process menu items configuration from extensions
 * @param {Object} config - Editor configuration object
 * @returns {Object} - Menu extension configuration object
 */
function processMenuConfiguration(config) {
  // Default menu configuration
  const menuConfig = {
    menuItemsFromExtensions: true
  }

  // If config has menu items, process them
  if (config.menu) {
    // If menu is false, disable the menu entirely
    if (config.menu === false) {
      return false
    }

    // Copy menu configuration
    Object.assign(menuConfig, config.menu)
  }

  return menuConfig
}

/**
 * Create editor instance asynchronously
 * @param {HTMLElement} textarea - Textarea element to replace with editor
 * @param {Object} config - Editor configuration
 * @returns {Promise} - Promise that resolves to editor instance
 */
async function createEditorAsync(textarea, config=null) {
  if (textarea.closest(".prose-editor")) return null

  config = config || JSON.parse(textarea.getAttribute(marker) || "{}")
  console.log("[CONFIGURABLE] Creating editor with config:", config);

  if (config.js_modules && config.js_modules.length) {
    await loadExtensionModules(config.js_modules)
  }

  const extensions = []
  const extensionStorage = {}

  // Process all extensions from the config
  for (const [extensionName, extensionConfig] of Object.entries(config.extensions || {})) {
    console.log(`[CONFIGURABLE] Processing extension ${extensionName}:`, extensionConfig);

    const extension = EXTENSIONS[extensionName]
    if (extension) {
      // Process special case for Menu
      if (extensionName === 'Menu') {
        // Configure Menu extension with processed menu config
        const menuConfig = processMenuConfiguration(config)
        if (menuConfig === false) {
          // Skip menu if disabled
          continue
        }

        console.log("[CONFIGURABLE] Configuring Menu extension with:", menuConfig);
        const configuredExtension = extension.configure(menuConfig)
        extensions.push(configuredExtension)
        continue
      }

      // Configure extension and handle menu items
      if (extensionConfig && typeof extensionConfig === 'object') {
        // Check for menu items
        if (extensionConfig.menuItems) {
          console.log(`[CONFIGURABLE] Extension ${extensionName} has menuItems config:`,
            JSON.stringify(extensionConfig.menuItems));

          // Store menu items for later use in extension storage
          extensionStorage[extensionName] = extensionStorage[extensionName] || {}
          extensionStorage[extensionName].menuItems = extensionConfig.menuItems

          // Clone the config to avoid modifying the original
          const configCopy = { ...extensionConfig }
          delete configCopy.menuItems

          // Add configured extension
          extensions.push(extension.configure(configCopy))
        } else {
          // Standard extension with configuration (no menu items)
          extensions.push(extension.configure(extensionConfig))
        }
      } else {
        // Extension without configuration
        extensions.push(extension)
      }
    }
  }

  // Ensure Menu extension is always included with menuItemsFromExtensions: true
  if (!extensions.some(ext => ext.name === 'menu')) {
    console.log("[CONFIGURABLE] Adding Menu extension with default config");
    extensions.push(EXTENSIONS.Menu.configure({
      menuItemsFromExtensions: true
    }));
  }

  console.log("[CONFIGURABLE] Final extensionStorage:", JSON.stringify(extensionStorage));
  console.log("[CONFIGURABLE] Extensions:", extensions.map(ext => ext.name));

  const editor = createTextareaEditor(textarea, extensions, extensionStorage);

  // Verify storage is set up correctly
  setTimeout(() => {
    console.log("[CONFIGURABLE] Editor storage after creation:", JSON.stringify(editor.storage));
  }, 100);

  return editor
}

// Track pending editor initializations
const pendingEditors = new WeakMap()

/**
 * Create editor instance with proper initialization tracking
 * @param {HTMLElement} textarea - Textarea element to replace with editor
 * @param {Object} config - Editor configuration
 * @returns {Promise} - Promise that resolves to editor instance
 */
function createEditor(textarea, config=null) {
  // Check if we already have a pending initialization for this textarea
  if (pendingEditors.has(textarea)) {
    return pendingEditors.get(textarea)
  }

  // Create a promise for the editor initialization
  const editorPromise = createEditorAsync(textarea, config)
    .then(editor => {
      // The editor is initialized and ready to use
      if (editor) {
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
      console.error('[CONFIGURABLE] Error initializing prose editor:', error)
      // Remove from pending tracking on error
      pendingEditors.delete(textarea)
      return null
    })

  // Track this pending initialization
  pendingEditors.set(textarea, editorPromise)

  // Return the promise
  return editorPromise
}

// Initialize all editors with the configurable marker
initializeEditors(createEditor, `[${marker}]`)

// Export utility functions for external use
export { createEditor }
