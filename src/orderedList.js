import { OrderedList as TiptapOrderedList } from "@tiptap/extension-ordered-list"

/**
 * Custom OrderedList extension that overrides the default input rules
 * to prevent automatic list creation when typing "1. " at the beginning of a line.
 */
export const OrderedList = TiptapOrderedList.configure({
  // Set keepMarks and keepAttributes to default values
  keepMarks: false,
  keepAttributes: false,
  // Default HTML attributes
  HTMLAttributes: {},
}).extend({
  addInputRules() {
    // Return an empty array to disable the default input rule (1. → ordered list)
    return []
  },
})
