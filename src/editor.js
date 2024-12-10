import "./editor.css"

import * as library from "./library.js"

window.DjangoProseEditor = library

window.DjangoProseEditor.loadExtensions = (group) => {
  switch (group) {
    case "tables":
      Object.assign(library, import("./library-tables.js"))
      break
    case "textstyle":
      Object.assign(library, import("./library-textstyle.js"))
      break
  }
}
