import { crel } from "./utils.js"

/**
 * Creates a material design icon button for the menu
 * @param {string} textContent - The material icon name
 * @param {string} title - The button tooltip text
 * @returns {HTMLElement} - The button DOM element
 */
export function materialButton(textContent, title) {
  return crel("span", {
    className: "prose-menubar__button material-icons",
    textContent,
    title,
  })
}

/**
 * Creates an SVG button for the menu
 * @param {string} innerHTML - The SVG HTML content
 * @param {string} title - The button tooltip text
 * @returns {HTMLElement} - The button DOM element
 */
export function svgButton(innerHTML, title = "") {
  return crel("span", {
    className: "prose-menubar__button",
    innerHTML,
    title,
  })
}

/**
 * Creates a heading button for the menu
 * @param {number} level - The heading level (1-6)
 * @returns {Object} - The menu item object
 */
export function createHeadingButton(level) {
  const dom = crel("span", {
    className: "prose-menubar__button prose-menubar__button--heading",
    title: `heading ${level}`,
  })

  dom.append(
    crel("span", { className: "material-icons", textContent: "title" }),
    crel("span", { className: "level", textContent: `${level}` }),
  )

  return {
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level }).run()
    },
    dom,
    active(editor) {
      return editor.isActive("heading", { level })
    },
    enabled(editor) {
      return editor.can().toggleHeading({ level })
    },
  }
}

/**
 * Creates a mark toggle button for the menu
 * @param {string} markType - The mark type name
 * @param {HTMLElement} dom - The button DOM element
 * @returns {Object|null} - The menu item object, or null if the mark doesn't exist
 */
export function createMarkButton(editor, markType, dom) {
  return markType in editor.schema.marks
    ? {
        command(editor) {
          editor.chain().focus().toggleMark(markType).run()
        },
        dom,
        active: (editor) => editor.isActive(markType),
        enabled: (editor) => editor.can().toggleMark(markType),
      }
    : null
}

/**
 * Finds an extension in the editor
 * @param {Editor} editor - The editor instance
 * @param {string} extension - The extension name
 * @returns {Extension|undefined} - The extension object if found
 */
export function findExtension(editor, extension) {
  return editor.extensionManager.extensions.find((e) => e.name === extension)
}
