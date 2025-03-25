import { Table as TiptapTable } from "@tiptap/extension-table"

import { gettext, updateAttrsDialog } from "./utils.js"

const tableDialog = updateAttrsDialog(
  {
    rows: {
      type: "number",
      title: gettext("Rows"),
      format: "number",
      default: "3",
      min: "1",
      max: "20",
    },
    cols: {
      type: "number",
      title: gettext("Columns"),
      format: "number",
      default: "3",
      min: "1",
      max: "10",
    },
    withHeaderRow: {
      title: gettext("Include header row"),
      enum: ["Yes", "No"],
      default: "No",
    },
  },
  {
    title: gettext("Table Properties"),
    submitText: gettext("Insert Table"),
  },
)

export const Table = TiptapTable.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      insertTableWithOptions:
        () =>
        ({ editor }) => {
          // Show table configuration dialog
          tableDialog(editor, {
            rows: "3",
            cols: "3",
            withHeaderRow: "No",
          }).then((attrs) => {
            if (attrs) {
              const config = {
                rows: Number.parseInt(attrs.rows, 10) || 3,
                cols: Number.parseInt(attrs.cols, 10) || 3,
                withHeaderRow: attrs.withHeaderRow === "Yes",
              }

              // Insert table with the configured options
              editor.chain().focus().insertTable(config).run()
            }
          })
        },
    }
  },
})
