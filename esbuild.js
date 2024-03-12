const esbuild = require("esbuild")
const postcss = require("esbuild-postcss")
const watch = process.argv.includes("watch")
  ? {
      onRebuild(error, result) {
        if (error) console.error("[Editor part] watch build failed:", error)
        else console.log("[Editor part] watch build succeeded:", result)
      },
    }
  : false

esbuild
  .build({
    entryPoints: ["./src/index.js"],
    jsxFactory: "h",
    jsxFragment: "Fragment",
    loader: {
      ".js": "jsx",
      ".svg": "file",
    },
    minify: true,
    bundle: true,
    target: "es6",
    format: "iife",
    globalName: "DjangoProseEditor",
    plugins: [postcss()],
    outfile: "django_prose_editor/static/django_prose_editor/editor.js",
    sourcemap: true,
    watch,
  })
  .then((...args) => {
    console.log("[Editor part] build succeeded", args)
  })
  .catch(() => process.exit(1))
