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
------------------------

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
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
    content = ProseEditorField(
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
    content = ProseEditorField(
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
Sanitization is enabled by default for the ``ProseEditorField``:

.. code-block:: python

    # Automatically sanitizes based on extension configuration (sanitize=True is the default)
    content = ProseEditorField(
        extensions={"Bold": True, "Link": True}
    )

    # You can explicitly disable sanitization if needed
    content = ProseEditorField(
        extensions={"Bold": True, "Link": True},
        sanitize=False
    )

Advanced Sanitization Options
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Some extensions support additional sanitization options. For example, the Link extension
can restrict URLs to specific protocols:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Link": {
                "protocols": ["http", "https", "mailto"],  # Only allow these protocols
            }
        }
    )

This restriction is enforced both in the editor UI and during server-side sanitization.
URLs not matching these protocols will be removed during sanitization.

Accessing Sanitization Rules Directly
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can also access the generated sanitization rules directly:

.. code-block:: python

    from django_prose_editor.config import allowlist_from_extensions

    # Note! This is subject to change, because right now, the allowlist
    # not only contains data for the sanitizer but could also contain
    # JavaScript modules which should be loaded. That's a bit ugly.
    allowlist = allowlist_from_extensions(extensions={"Bold": True, "Link": True})
    # Returns {"tags": ["strong", "a"], "attributes": {"a": ["href"]}}

Creating Custom Sanitizers
~~~~~~~~~~~~~~~~~~~~~~~~~~

You can create a custom sanitizer function from any extension configuration using the `create_sanitizer` utility:

.. code-block:: python

    from django_prose_editor.fields import create_sanitizer

    # Create a sanitizer function for a specific set of extensions
    my_sanitizer = create_sanitizer({
        "Bold": True,
        "Italic": True,
        "Link": {"enableTarget": True}
    })

    # Use the sanitizer in your code
    sanitized_html = my_sanitizer(unsafe_html)

This is particularly useful when you need a standalone sanitizer that matches your editor configuration without using the entire field.

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
-------------------------------

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

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
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
~~~~~~~~~~~~~~~~~~~~~~~~~~

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

Common Extension Configurations
--------------------------------

Django Prose Editor provides special configuration options for common extensions:

**Heading Level Restrictions**

You can restrict heading levels to a subset of H1-H6:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Heading": {
                "levels": [1, 2, 3],  # Only allow H1, H2, H3
            }
        }
    )

This configuration will only allow the specified heading levels in both the editor
and the sanitized output.

For those who need more control, you can still use the lower-level configuration options or create custom presets as described in the main documentation.

JavaScript Events
~~~~~~~~~~~~~~~~~

The configurable editor fires custom events that you can listen for in your frontend code:

**prose-editor:ready**

This event is fired when an editor is fully initialized and ready to use. It's dispatched on the textarea element and bubbles up the DOM.

.. code-block:: javascript

    // Listen for editor initialization
    document.addEventListener('prose-editor:ready', (event) => {
        // Access the editor instance and the textarea
        const { editor, textarea } = event.detail;

        // Example: Focus the editor when it's ready
        editor.commands.focus();

        // Example: Get the textarea's ID for reference
        console.log(`Editor ready for ${textarea.id}`);
    });

The event provides an object in the `detail` property with:
- `editor`: The initialized editor instance with full access to Tiptap commands and API
- `textarea`: The original textarea element that was enhanced with the editor

This is useful when you need to interact with editors programmatically or initialize other components that depend on the editor being fully loaded.

**Accessing Editor Instances Programmatically**

For more advanced use cases, you can import the `getEditorPromise` function to get a reference to a pending or completed editor initialization:

.. code-block:: javascript

    // In your custom script
    import { getEditorPromise } from "django-prose-editor/configurable";

    // Get the textarea element
    const textarea = document.querySelector('#my-editor');

    // Get the promise for this editor's initialization
    const editorPromise = getEditorPromise(textarea);

    if (editorPromise) {
        // Wait for the editor to be fully initialized
        editorPromise.then(editor => {
            if (editor) {
                // Do something with the editor instance
                editor.commands.setContent('<p>New content</p>');
            }
        });
    }

Advanced Customization with Presets
-----------------------------------

For more advanced customization, you can create custom presets by
adding additional assets to load:

.. code-block:: python

    from js_asset import JS

    DJANGO_PROSE_EDITOR_PRESETS = {
        "announcements": [
            JS("prose-editors/announcements.js", {"type": "module"}),
        ],
    }

The preset can be selected when instantiating the field:

.. code-block:: python

    text = ProseEditorField(_("text"), preset="announcements")

The editor uses ES modules and importmaps; you can import extensions and
utilities from the `django-prose-editor/editor` module. The importmap support
is provided by `django-js-asset
<https://github.com/matthiask/django-js-asset/>`_, check it's README to learn
more.

Here's the example:

.. code-block:: javascript

    import {
      // Always recommended:
      Document, Dropcursor, Gapcursor, Paragraph, HardBreak, Text,

      // Add support for a few marks:
      Bold, Italic, Subscript, Superscript, Link,

      // A menu is always nice:
      Menu,

      // Helper which knows how to attach a prose editor to a textarea:
      createTextareaEditor,

      // Helper which runs the initialization on page load and when
      // new textareas are added through Django admin inlines:
      initializeEditors,
    } from "django-prose-editor/editor"


    // "announcements" is the name of the preset.
    const marker = "data-django-prose-editor-announcements"

    function createEditor(textarea) {
      if (textarea.closest(".prose-editor")) return
      const config = JSON.parse(textarea.getAttribute(marker))

      const extensions = [
        Document, Dropcursor, Gapcursor, Paragraph, HardBreak, Text,

        Bold, Italic, Subscript, Superscript, Link,

        Menu,
      ]

      return createTextareaEditor(textarea, extensions)
    }

    initializeEditors(createEditor, `[${marker}]`)
