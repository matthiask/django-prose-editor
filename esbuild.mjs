import * as esbuild from "esbuild"
import postcss from "esbuild-postcss"

const devMode = process.argv.includes("watch")
const ctx = await esbuild.context({
  entryPoints: ["./src/overrides.css", "./src/editor.js"],
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
  outdir: "django_prose_editor/static/django_prose_editor/",
  sourcemap: devMode,
})

if (devMode) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  ctx.dispose()
}
