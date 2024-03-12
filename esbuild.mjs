import * as esbuild from "esbuild"
import postcss from "esbuild-postcss"

let devMode = process.argv.includes("watch")
let ctx = await esbuild.context({
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
  sourcemap: devMode,
})

if (devMode) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  ctx.dispose()
}
