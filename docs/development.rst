Development
===========

For the best development experience:

1. Install django-prose-editor in editable mode in your project:

   .. code-block:: shell

       pip install -e /path/to/django-prose-editor

2. Run ``yarn && yarn dev`` in the django-prose-editor directory to watch for
   asset changes.

When using ``yarn dev``:

- The generated CSS and JavaScript is not minified, making it easier to debug.
- Source maps are generated to help identify exactly where in the source code
  an error occurs.
- The watcher will rebuild files automatically when you make changes.

Source maps are generated in development mode (``yarn dev``) for easier
debugging, but not included in production builds to keep the package size
manageable. The JavaScript in this project is quite extensive, so source maps
would significantly increase the distribution size.

The pre-commit configuration includes a hook that prevents committing files
with source map references, ensuring that development artifacts don't make it
into the repository.

Browser Testing with Playwright
-------------------------------

This project uses tox to describe environments and Playwright for browser-based
testing of the prose editor. Browser tests are run as a part of the normal tests
so just use tox as you normally would.

Code Style and Linting
----------------------

This project uses pre-commit hooks to enforce coding style guidelines. We use
Ruff for Python linting and formatting, Biome for JavaScript/TypeScript linting
and formatting and a few other hooks.

To set up pre-commit using uv:

.. code-block:: shell

    uv tool install pre-commit
    pre-commit install

Pre-commit will automatically check your code for style issues when you commit
changes.
