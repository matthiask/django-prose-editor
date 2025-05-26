import "@tiptap/core"

// Export a type for Dispatch to fix import issues
export type Dispatch<T = any> = (tr: T) => void

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    insertFigure: {
      insertFigure: () => ReturnType
    }
    toggleFullscreen: {
      toggleFullscreen: () => ReturnType
    }
    editHTML: {
      editHTML: () => ReturnType
    }
    addLink: {
      addLink: () => ReturnType
    }
    updateListAttributes: {
      updateListAttributes: (attributes: Record<string, any>) => ReturnType
    }
    insertTableWithOptions: {
      insertTableWithOptions: (options: {
        rows: number
        cols: number
        withHeaderRow: boolean
      }) => ReturnType
    }
  }

  interface SingleCommands {
    insertFigure: () => boolean
    toggleFullscreen: () => boolean
    editHTML: () => void
    addLink: () => void
    updateListAttributes: (attributes: Record<string, any>) => boolean
    insertTableWithOptions: (options: {
      rows: number
      cols: number
      withHeaderRow: boolean
    }) => boolean
  }

  interface ChainedCommands {
    insertFigure: () => ChainedCommands
    toggleFullscreen: () => ChainedCommands
    editHTML: () => ChainedCommands
    addLink: () => ChainedCommands
    updateListAttributes: (attributes: Record<string, any>) => ChainedCommands
    insertTableWithOptions: (options: {
      rows: number
      cols: number
      withHeaderRow: boolean
    }) => ChainedCommands
  }

  interface CanCommands {
    insertFigure: () => boolean
    toggleFullscreen: () => boolean
    editHTML: () => boolean
    addLink: () => boolean
    updateListAttributes: (attributes: Record<string, any>) => boolean
    insertTableWithOptions: (options: {
      rows: number
      cols: number
      withHeaderRow: boolean
    }) => boolean
  }

  interface Storage {
    fullscreen?: {
      isFullscreen: boolean
      fullscreen: boolean
      scrollPosition?: number
    }
    menu?: any
  }
}
