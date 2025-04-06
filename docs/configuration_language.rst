Editor Configuration Language
=============================

Overview
~~~~~~~~

Django Prose Editor provides a unified configuration approach that synchronizes front-end editor capabilities with server-side sanitization rules. This ensures consistency between what users can create in the editor and what is allowed after sanitization.

Basic Configuration
~~~~~~~~~~~~~~~~~~~

The configuration system uses a declarative format that defines:

1. Editor extensions (Tiptap extensions)
2. HTML elements and attributes allowed by these extensions
3. Server-side sanitization rules derived from the configuration

Example Configuration
---------------------

.. code-block:: python

    from django_prose_editor.configurable import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            extensions={
                # Core text formatting
                "Bold": True,
                "Italic": True,
                "Strike": True,
                "Underline": True,
                "HardBreak": True,

                # Structure
                "Heading": {
                    "levels": [1, 2, 3]  # Only allow h1, h2, h3
                },
                "BulletList": True,
                "OrderedList": True,
                "Blockquote": True,

                # Advanced extensions
                "Link": {
                    "enableTarget": True,  # Enable "open in new window"
                    "protocols": ["http", "https", "mailto"],  # Limit protocols
                },
                "Table": True,

                # Editor capabilities
                "History": True,       # Enables undo/redo
                "HTML": True,          # Allows HTML view
                "Typographic": True,   # Enables typographic chars
            }
        )

Configuring Extensions
~~~~~~~~~~~~~~~~~~~~~~

The `extensions` parameter allows you to specify exactly which extensions you want to enable in your editor:

.. code-block:: python

    # Simple configuration with basic text formatting and links
    content = ConfigurableProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "Strike": True,
            "Link": True,
            "BulletList": True,
            "OrderedList": True,
        }
    )

    # More advanced configuration with specific settings for extensions
    content = ConfigurableProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "Heading": {"levels": [1, 2, 3]},  # Only allow H1-H3
            "Link": {"enableTarget": True},  # Enable "open in new tab"
            "Table": True,
        }
    )

Server-side Sanitization
~~~~~~~~~~~~~~~~~~~~~~~~

The configuration automatically generates appropriate sanitization rules for nh3.
Sanitization is enabled by default for the ConfigurableProseEditorField:

.. code-block:: python

    # Automatically sanitizes based on extension configuration (sanitize=True is the default)
    content = ConfigurableProseEditorField(
        extensions={"Bold": True, "Link": True}
    )

    # You can explicitly disable sanitization if needed
    content = ConfigurableProseEditorField(
        extensions={"Bold": True, "Link": True},
        sanitize=False
    )

    # You can also access the generated rules directly
    from django_prose_editor.config import extensions_to_allowlist

    allowlist = extensions_to_allowlist(extensions={"Bold": True, "Link": True})
    # Returns {"tags": ["strong", "a"], "attributes": {"a": ["href"]}}

Extension-to-HTML Mapping
~~~~~~~~~~~~~~~~~~~~~~~~~

This table shows how editor extensions map to HTML elements and attributes:

============== ======================= ============================
Extension      HTML Elements           HTML Attributes
============== ======================= ============================
Bold           <strong>                -
Italic         <em>                    -
Strike         <s>                     -
Underline      <u>                     -
Subscript      <sub>                   -
Superscript    <sup>                   -
Heading        <h1> to <h6>            -
BulletList     <ul>, <li>              -
OrderedList    <ol>, <li>              start, type
Blockquote     <blockquote>            -
HorizontalRule <hr>                    -
Link           <a>                     href, target, rel
Table          <table>, <tr>,          rowspan, colspan
               <th>, <td>
============== ======================= ============================

Custom Extensions
~~~~~~~~~~~~~~~~~

The configurable preset allows you to add custom Tiptap extensions without having to create a custom preset.
You can define extension groups in your Django settings, with each group containing related extensions that share the same JavaScript assets:

.. code-block:: python

    # In settings.py
    from js_asset import static_lazy
    from django_prose_editor.config import html_tags

    # Define your custom extensions with their processors
    DJANGO_PROSE_EDITOR_EXTENSIONS = [
        # Simple extension group
        {
            # JavaScript assets shared by all extensions in this group
            "js": [
                static_lazy("myapp/extensions/custom-extension.js")
            ],
            # Extension processors for this group
            "extensions": {
                "MyCustomExtension": html_tags(
                    tags=["div"],
                    attributes={"div": ["data-custom"]}
                )
            }
        },

        # Blue bold extension group
        {
            "js": [
                static_lazy("myapp/extensions/blue-bold.js")
            ],
            "extensions": {
                "BlueBold": html_tags(
                    tags=["strong"],
                    attributes={"strong": ["style", "class"]}
                )
            }
        },

        # Complex extension group with multiple related extensions
        {
            "js": [
                static_lazy("myapp/extensions/table/table.js")
            ],
            "extensions": {
                "Table": "myapp.extensions.process_table",
                "TableRow": "myapp.extensions.process_table_row",
                "TableCell": "myapp.extensions.process_table_cell",
                "TableHeader": "myapp.extensions.process_table_header"
            }
        }
    ]

The JavaScript module should export the extension as a named export:

.. code-block:: javascript

    // myapp/static/myapp/extensions/custom-extension.js
    import { Extension } from "django-prose-editor/editor"

    // Create the extension
    export const MyCustomExtension = Extension.create({
      name: 'MyCustomExtension',
      // Extension implementation...
    })

Simple Example: Blue Bold Text
------------------------------

Here's a minimal example of a custom extension that adds a blue color to bold text:

.. code-block:: javascript

    // myapp/static/myapp/extensions/blue-bold.js
    import { Mark } from "django-prose-editor/editor"

    // Extend the bold mark to make it blue
    export const BlueBold = Mark.create({
      name: 'BlueBold',

      // Extend the default bold mark
      priority: 101, // Higher than the default bold priority

      // Customize how it renders in the DOM
      renderHTML({ HTMLAttributes }) {
        return ['strong', {
          ...HTMLAttributes,
          style: 'color: blue;'
        }, 0]
      },

      // Add a button to the toolbar
      addOptions() {
        return {
          HTMLAttributes: {
            class: 'blue-bold-text',
          },
        }
      }
    })

Then you can use your extension in your models:

.. code-block:: python

    from django_prose_editor.configurable import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            extensions={
                "Bold": True,
                "Italic": True,

                # Enable your custom extension
                "MyCustomExtension": {
                    "option1": "value",  # Configuration options
                },

                # Enable the blue bold extension
                "BlueBold": True
            }
        )


Technical Details
~~~~~~~~~~~~~~~~~

Custom Processor Functions
--------------------------

The processor function is the core of custom extensions. It determines what HTML elements, attributes, and JavaScript modules are used:

.. code-block:: python

    # Example processor function in myapp/extensions.py
    def process_complex_extension(config, shared_config):
        """
        Process custom extension configuration for sanitization.

        Args:
            config: The extension configuration (e.g., {"option1": "value"})
            shared_config: The shared configuration dictionary to update
        """
        # Prepare tags and attributes
        tags = ["div", "span"]
        attributes = {
            "div": ["class", "id"],
            "span": ["class"],
        }

        # Example: Modify the configuration based on options
        if config.get("restrictToDiv", False):
            # Only allow div elements
            tags = ["div"]
            attributes = {"div": ["class", "id"]}

        # Example: Add data attributes if enabled
        if config.get("allowDataAttributes", False):
            if "div" not in attributes:
                attributes["div"] = []
            attributes["div"].extend(["data-custom", "data-value"])

        # Add tags and attributes to the shared config
        add_tags_and_attributes(shared_config, tags, attributes)

    # Then in settings.py, register your processor by its dotted path:
    from js_asset import static_lazy
    from django_prose_editor.config import html_tags

    DJANGO_PROSE_EDITOR_EXTENSIONS = [
        # Complex extension group
        {
            "js": [
                static_lazy("myapp/extensions/complex-extension.js")
            ],
            "extensions": {
                "ComplexExtension": "myapp.extensions.process_complex_extension"
            }
        },

        # Simple extension group
        {
            "js": [
                static_lazy("myapp/extensions/simple-extension.js")
            ],
            "extensions": {
                "SimpleExtension": html_tags(
                    tags=["div", "span"],
                    attributes={"div": ["class"], "span": ["class"]}
                )
            }
        }
    ]

Working Principles
------------------

This configuration system bridges the gap between front-end capabilities and server-side sanitization by:

1. Defining a clear mapping between editor extensions and HTML elements/attributes
2. Automatically generating sanitization rules from the extension configuration
3. Supporting extension with custom components
4. Providing processor functions for complex configurations

Special Features
----------------

**Link Protocol Sanitization**

When configuring the `Link` extension, you can restrict URLs to specific protocols:

.. code-block:: python

    content = ConfigurableProseEditorField(
        extensions={
            "Link": {
                "protocols": ["http", "https", "mailto"],  # Only allow these protocols
            }
        },
        sanitize=True
    )

This restriction is enforced both in the editor UI and during server-side sanitization.
URLs not matching these protocols will be removed during sanitization.

**Heading Level Restrictions**

You can restrict heading levels to a subset of H1-H6:

.. code-block:: python

    content = ConfigurableProseEditorField(
        extensions={
            "Heading": {
                "levels": [1, 2, 3],  # Only allow H1, H2, H3
            }
        }
    )

This configuration will only allow the specified heading levels in both the editor
and the sanitized output.

For those who need more control, you can still use the lower-level configuration options or create custom presets as described in the main documentation.
