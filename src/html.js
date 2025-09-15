import { Extension } from "@tiptap/core"

import { gettext, updateAttrsDialog } from "./utils.js"

const htmlDialog = updateAttrsDialog(
  {
    html: {
      type: "string",
      title: "HTML",
      description: gettext(
        "The HTML contents of the editor. Note that the allowed HTML is restricted by the editor schema.",
      ),
      format: "textarea",
    },
  },
  {
    title: gettext("Edit HTML"),
    actions: [
      {
        text: gettext("Prettify"),
        handler: (_currentValues, form) => {
          const htmlTextarea = form.querySelector("textarea")
          if (htmlTextarea) {
            const prettifiedHTML = prettifyHTML(htmlTextarea.value)
            htmlTextarea.value = prettifiedHTML
            htmlTextarea.dispatchEvent(new Event("input"))
          }
        },
      },
    ],
  },
)

const areArraysEqual = (arr1, arr2) =>
  Array.isArray(arr1) &&
  Array.isArray(arr2) &&
  arr1.length === arr2.length &&
  arr1.every((val, index) => Object.is(val, arr2[index]))

// Simple HTML prettifier that adds newlines and basic indentation
const prettifyHTML = (html) => {
  if (!html) return html

  // Extract <pre> tags and their content to preserve whitespace
  const preBlocks = []
  const preRegex = /<pre(?:\s[^>]*)?>[\s\S]*?<\/pre>/gi
  let formatted = html.replace(preRegex, (match) => {
    const placeholder = `__PRE_BLOCK_${preBlocks.length}__`
    preBlocks.push(match)
    return placeholder
  })

  // List of block elements that should have newlines
  const blockElements = [
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "tfoot",
    "section",
    "article",
    "header",
    "footer",
    "aside",
    "nav",
    "blockquote",
    "figure",
    "figcaption",
    "form",
    "fieldset",
  ]

  // Create regex patterns for opening and closing tags (only need to compile once)
  const closingRE = new RegExp(`</(${blockElements.join("|")})>`, "gi")
  const openingRE = new RegExp(
    `<(${blockElements.join("|")})(?:\\s+[^>]*)?>`,
    "gi",
  )

  // Add newlines before opening and after closing block tags
  formatted = formatted.replace(closingRE, "</$1>\n").replace(openingRE, "\n$&")

  // Split into lines and filter out empty lines
  const lines = formatted.split("\n").filter((line) => line.trim())

  let indentLevel = 0

  // Process each line for indentation
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip indentation for lines containing pre block placeholders
    if (line.includes("__PRE_BLOCK_")) {
      continue
    }

    const closing = [...line.matchAll(closingRE)]
    const opening = [...line.matchAll(openingRE)]

    // Check if this line has matching opening and closing tags (same element)
    // If so, we don't change indentation for this element
    const hasSelfContainedElement =
      closing.length &&
      opening.length &&
      areArraysEqual(closing[0].slice(1), opening[0].slice(1))

    // Check for closing tags on this line and adjust indent (unless self-contained)
    if (!hasSelfContainedElement && closing.length) {
      indentLevel = Math.max(0, indentLevel - closing.length)
    }

    // Apply indentation
    lines[i] = " ".repeat(indentLevel * 2) + line

    // Check for opening tags on this line and adjust indent for next line (unless self-contained)
    if (!hasSelfContainedElement && opening.length) {
      indentLevel += opening.length
    }
  }

  // Restore <pre> blocks with their original whitespace
  let result = lines.join("\n")
  preBlocks.forEach((preBlock, index) => {
    result = result.replace(`__PRE_BLOCK_${index}__`, preBlock)
  })

  return result
}

export const HTML = Extension.create({
  name: "html",

  addCommands() {
    return {
      editHTML:
        () =>
        ({ editor }) => {
          // Show current HTML without automatic prettification
          const currentHTML = editor.getHTML()

          htmlDialog(editor, { html: currentHTML }).then((attrs) => {
            if (attrs) {
              editor.chain().focus().setContent(attrs.html, true).run()
            }
          })
        },
    }
  },
})
