import { gettext } from "./utils.js"
import { updateAttrsDialog } from "./utils.js"

export const tableDialog = updateAttrsDialog(
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
