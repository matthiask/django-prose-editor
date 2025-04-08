Usage with JavaScript bundlers
==============================

If you're using a bundler such as esbuild, rspack or webpack you have to ensure
that the django-prose-editor JavaScript library is treated as an external and
not bundled into a centeral JavaScript file. In the case of rspack this means
adding the following lines to your rspack configuration:

.. code-block:: javascript

    module.exports = {
        // ...
        experiments: { outputModule: true },
        externals: {
            "django-prose-editor/editor": "module django-prose-editor/editor",
            "django-prose-editor/configurable": "module django-prose-editor/configurable",
        },
    }

This makes rspack emit ES modules and preserves imports of
``django-prose-editor/editor`` and similar in the output instead of trying to
bundle the library.
