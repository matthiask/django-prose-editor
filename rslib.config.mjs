export default {
  source: {
    entry: {
      // init: "./src/init.js",
      overrides: "./src/overrides.css",
      editor: "./src/editor.js",
      "ext-code": "./src/ext-code.js",
      "ext-style": "./src/ext-style.js",
      "ext-tables": "./src/ext-tables.js",
    },
  },
  lib: [
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      autoExtension: false,
      autoExternal: false,
    },
  ],
  output: {
    cleanDistPath: false,
    distPath: {
      root: "django_prose_editor/static/django_prose_editor/",
      css: "",
      js: "",
    },
    minify: true,
    target: "web",
  },
}
