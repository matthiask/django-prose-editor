import { Extension } from "@tiptap/core"

/**
 * Fullscreen extension for the prose editor
 * Adds a button to toggle fullscreen mode, expanding the editor to cover the entire viewport
 */
export const Fullscreen = Extension.create({
  name: "fullscreen",

  addOptions() {
    return {
      // CSS class applied to the editor container when in fullscreen mode
      fullscreenClass: "prose-editor-fullscreen",
    }
  },

  addCommands() {
    return {
      toggleFullscreen:
        () =>
        ({ editor }) => {
          const isFullscreen = editor.storage.fullscreen.fullscreen

          // Toggle fullscreen state
          editor.storage.fullscreen.fullscreen = !isFullscreen

          // Apply or remove the fullscreen class to the editor container
          const editorContainer =
            editor.options.element.closest(".prose-editor")

          if (editor.storage.fullscreen.fullscreen) {
            editorContainer.classList.add(this.options.fullscreenClass)
            // Store the scroll position
            editor.storage.fullscreen.scrollPosition = window.scrollY
            // Prevent body scrolling
            document.body.style.overflow = "hidden"
            // Focus the editor after going fullscreen
            editor.commands.focus()
          } else {
            editorContainer.classList.remove(this.options.fullscreenClass)
            // Restore body scrolling
            document.body.style.overflow = ""
            // Restore scroll position
            window.scrollTo(0, editor.storage.fullscreen.scrollPosition || 0)
          }

          return true
        },
    }
  },

  addStorage() {
    return {
      fullscreen: false,
      scrollPosition: 0,
    }
  },

  addKeyboardShortcuts() {
    return {
      // Add ESC shortcut to exit fullscreen mode
      Escape: () => {
        if (this.editor.storage.fullscreen.fullscreen) {
          return this.editor.commands.toggleFullscreen()
        }
        return false
      },
      // Add F11 shortcut to toggle fullscreen mode
      F11: () => {
        return this.editor.commands.toggleFullscreen()
      },
    }
  },
})
