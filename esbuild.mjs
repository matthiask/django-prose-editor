import * as esbuild from "esbuild"
import postcss from "esbuild-postcss"

const devMode = process.argv.includes("watch")
const ctx = await esbuild.context({
  entryPoints: ["./src/overrides.css", "./src/editor.js"],
  minify: true,
  bundle: true,
  target: "es6",
  format: "iife",
  globalName: "DjangoProseEditor",
  plugins: [postcss()],
  outdir: "django_prose_editor/static/django_prose_editor/",
  // I really like sourcemaps, but I don't want to distribute them here.
  // People can check the open source package after all.
  // sourcemap: devMode,
})

if (devMode) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  ctx.dispose()
}
