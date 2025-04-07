import { Mark, mergeAttributes } from "django-prose-editor/editor"

// Extend the bold mark to make it blue
export const BlueBold = Mark.create({
  name: 'BlueBold',

  // Extend the default bold mark
  priority: 101, // Higher than the default bold priority

  // Add keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleMark(this.name),
    }
  },

  // Add input rules
  addInputRules() {
    // Match **blue:text** and apply BlueBold mark (more specific pattern)
    return [
      {
        find: /\*\*blue:(.+?)\*\*/g,
        handler: ({ state, range, match }) => {
          const attributes = {}
          const { tr } = state

          // Delete the matching text
          tr.delete(range.from, range.to)

          // Add the text without the markers
          const text = match[1]
          tr.insertText(text, range.from)

          // Apply the BlueBold mark to the inserted text
          tr.addMark(range.from, range.from + text.length, this.type.create(attributes))

          return tr
        }
      }
    ]
  },

  // Customize how it renders in the DOM
  renderHTML({ HTMLAttributes }) {
    return ['strong', mergeAttributes(
      HTMLAttributes,
      { style: 'color: blue;', class: 'blue-bold-text' }
    ), 0]
  },

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'blue-bold-text',
      },
    }
  }
})
