export default {
  source: {
    entry: {
      init: "./src/init.js",
      overrides: "./src/overrides.css",
      editor: "./src/editor.js",
    },
  },
  lib: [
    // { format: 'esm', syntax: 'es2021' },
    { format: "cjs", bundle: true, syntax: "es2021" },
  ],
  output: {
    distPath: {
      root: "django_prose_editor/static/django_prose_editor/",
      css: "",
      js: "",
    },
    minify: true,
    target: "web",
  },
}
