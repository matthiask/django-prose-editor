import * as esbuild from "esbuild"
import postcss from "esbuild-postcss"

const devMode = process.argv.includes("watch")
const ctx = await esbuild.context({
  entryPoints: ["./src/overrides.css", "./src/editor.js"],
  minify: true,
  bundle: true,
  format: "esm",
  target: "es6",
  plugins: [
    postcss(),
    {
      name: "rebuild-notify",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length) {
            console.error(result.errors)
          } else {
            console.debug("Rebuild succesful.")
          }
        })
      },
    },
  ],
  outdir: "django_prose_editor/static/django_prose_editor/",
  // I really like sourcemaps, but I don't want to distribute them here.
  // People can check the open source package after all.
  sourcemap: true,
})

if (devMode) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  ctx.dispose()
}
