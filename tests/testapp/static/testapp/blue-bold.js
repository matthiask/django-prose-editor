import { Mark } from "django-prose-editor/editor"

// Extend the bold mark to make it blue
export const BlueBold = Mark.create({
  name: 'BlueBold',

  // Extend the default bold mark
  priority: 101, // Higher than the default bold priority

  // Customize how it renders in the DOM
  renderHTML({ HTMLAttributes }) {
    return ['strong', {
      ...HTMLAttributes,
      style: 'color: blue;'
    }, 0]
  },

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'blue-bold-text',
      },
    }
  }
})
