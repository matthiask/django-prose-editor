import type { Editor } from "@tiptap/core"
import { Extension } from "@tiptap/core"

import { gettext, updateAttrsDialog } from "./utils"

interface HTMLDialogAttrs {
  html: string
}

const htmlDialog = updateAttrsDialog(
  {
    html: {
      type: "string",
      title: "HTML",
      format: "textarea",
    },
  },
  {
    title: gettext("Edit HTML"),
  },
)

const areArraysEqual = (arr1: unknown[], arr2: unknown[]): boolean =>
  Array.isArray(arr1) &&
  Array.isArray(arr2) &&
  arr1.length === arr2.length &&
  arr1.every((val, index) => Object.is(val, arr2[index]))

// Simple HTML prettifier that adds newlines and basic indentation
const prettifyHTML = (html: string): string => {
  if (!html) return html

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

  let formatted = html

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

  return lines.join("\n")
}

export const HTML = Extension.create({
  name: "html",

  addCommands() {
    return {
      editHTML:
        () =>
        ({ editor }: { editor: Editor }) => {
          // Apply prettification to the HTML before showing dialog
          const prettifiedHTML = prettifyHTML(editor.getHTML())

          htmlDialog(editor, { html: prettifiedHTML }).then(
            (attrs: HTMLDialogAttrs | null) => {
              if (attrs) {
                editor.chain().focus().setContent(attrs.html, true).run()
              }
            },
          )
        },
    }
  },
})
