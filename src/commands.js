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

// Will be populated from menu.js when used
export const listPropertiesDialog = updateAttrsDialog(
  {
    start: {
      type: "number",
      title: gettext("Start at"),
      format: "number",
      default: "1",
      min: "1",
    },
    listType: {
      title: gettext("List type"),
      // enum will be updated dynamically when the dialog is called
      enum: [],
      default: "",
    },
  },
  {
    title: gettext("List Properties"),
    submitText: gettext("Update"),
  },
)
