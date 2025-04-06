Editor Configuration Language
=============================

Overview
~~~~~~~~

Django Prose Editor provides a unified configuration approach that synchronizes front-end editor capabilities with server-side sanitization rules. This ensures consistency between what users can create in the editor and what is allowed after sanitization.

Basic Configuration
~~~~~~~~~~~~~~~~~~~

The configuration system uses a declarative format that defines:

1. Editor features (Tiptap extensions)
2. HTML elements and attributes allowed by these features
3. Server-side sanitization rules derived from the configuration

Example Configuration
---------------------

.. code-block:: python

    from django_prose_editor.configurable import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            features={
                # Core text formatting
                "bold": True,
                "italic": True,
                "strike": True,
                "underline": True,
                "hardBreak": True,

                # Structure
                "heading": {
                    "levels": [1, 2, 3]  # Only allow h1, h2, h3
                },
                "bulletList": True,
                "orderedList": True,
                "blockquote": True,

                # Advanced features
                "link": {
                    "enableTarget": True,  # Enable "open in new window"
                    "protocols": ["http", "https", "mailto"],  # Limit protocols
                },
                "table": True,

                # Editor capabilities
                "history": True,       # Enables undo/redo
                "html": True,          # Allows HTML view
                "typographic": True,   # Enables typographic chars
            }
        )

Configuring Features
--------------------

The `features` parameter allows you to specify exactly which features you want to enable in your editor:

.. code-block:: python

    # Simple configuration with basic text formatting and links
    content = ConfigurableProseEditorField(
        features={
            "bold": True,
            "italic": True,
            "strike": True,
            "link": True,
            "bulletList": True,
            "orderedList": True,
        }
    )

    # More advanced configuration with specific settings for features
    content = ConfigurableProseEditorField(
        features={
            "bold": True,
            "italic": True,
            "heading": {"levels": [1, 2, 3]},  # Only allow H1-H3
            "link": {"enableTarget": True},  # Enable "open in new tab"
            "table": True,
        }
    )

Server-side Sanitization
.~~~~~~~~~~~~~~~~~~~~~~~

The configuration automatically generates appropriate sanitization rules for nh3.
Sanitization is enabled by default for the ConfigurableProseEditorField:

.. code-block:: python

    # Automatically sanitizes based on feature configuration (sanitize=True is the default)
    content = ConfigurableProseEditorField(
        features={"bold": True, "link": True}
    )

    # You can explicitly disable sanitization if needed
    content = ConfigurableProseEditorField(
        features={"bold": True, "link": True},
        sanitize=False
    )

    # You can also access the generated rules directly
    from django_prose_editor.config import features_to_allowlist

    allowlist = features_to_allowlist(features={"bold": True, "link": True})
    # Returns {"tags": ["strong", "a"], "attributes": {"a": ["href"]}}

Feature-to-HTML Mapping
~~~~~~~~~~~~~~~~~~~~~~~

This table shows how editor features map to HTML elements and attributes:

============== ======================= ============================
Feature        HTML Elements           HTML Attributes
============== ======================= ============================
bold           <strong>                -
italic         <em>                    -
strike         <s>                     -
underline      <u>                     -
subscript      <sub>                   -
superscript    <sup>                   -
heading        <h1> to <h6>            -
bulletList     <ul>, <li>              -
orderedList    <ol>, <li>              start, type
blockquote     <blockquote>            -
horizontalRule <hr>                    -
link           <a>                     href, target, rel
table          <table>, <tr>,          rowspan, colspan
               <th>, <td>
============== ======================= ============================

Custom Extensions
~~~~~~~~~~~~~~~~

The configurable preset allows you to add custom Tiptap extensions without having to create a custom preset.
You can define extension groups in your Django settings, with each group containing related features that share the same JavaScript assets:

.. code-block:: python

    # In settings.py
    from js_asset import static_lazy
    from django_prose_editor.config import create_simple_processor

    # Define your custom extensions with their processors
    DJANGO_PROSE_EDITOR_EXTENSIONS = [
        # Simple extension group
        {
            # JavaScript assets shared by all features in this group
            "js": [
                static_lazy("myapp/extensions/custom-extension.js")
            ],
            # Feature processors for this group
            "features": {
                "myCustomExtension": create_simple_processor(
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
            "features": {
                "blueBold": create_simple_processor(
                    tags=["strong"],
                    attributes={"strong": ["style", "class"]}
                )
            }
        },

        # Complex extension group with multiple related features
        {
            "js": [
                static_lazy("myapp/extensions/table/table.js")
            ],
            "features": {
                "table": "myapp.extensions.process_table",
                "tableRow": "myapp.extensions.process_table_row",
                "tableCell": "myapp.extensions.process_table_cell",
                "tableHeader": "myapp.extensions.process_table_header"
            }
        }
    ]

The JavaScript module should export the extension as its default export:

.. code-block:: javascript

    // myapp/static/myapp/extensions/custom-extension.js
    import { Extension } from "django-prose-editor/editor"

    // Create the extension
    const MyCustomExtension = Extension.create({
      name: 'myCustomExtension',
      // Extension implementation...
    })

    // Export it as the default export
    export default MyCustomExtension

Simple Example: Blue Bold Text
-----------------------------

Here's a minimal example of a custom extension that adds a blue color to bold text:

.. code-block:: javascript

    // myapp/static/myapp/extensions/blue-bold.js
    import { Mark } from "django-prose-editor/editor"

    // Extend the bold mark to make it blue
    const BlueBold = Mark.create({
      name: 'blueBold',

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

    export default BlueBold

Then you can use your extension in your models:

.. code-block:: python

    from django_prose_editor.configurable import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            features={
                "bold": True,
                "italic": True,

                # Enable your custom extension
                "myCustomExtension": {
                    "option1": "value",  # Configuration options
                },

                # Enable the blue bold extension
                "blueBold": True
            }
        )

Advanced Configuration
=====================

Step 1: Define Your Extension
.............................

First, create a JavaScript file with your custom Tiptap extension:

.. code-block:: javascript

    // myapp/static/myapp/extensions/custom-extension.js
    import { Extension } from "django-prose-editor/editor"

    export default Extension.create({
      name: 'myCustomExtension',

      addOptions() {
        return {
          option1: 'default',
          option2: true,
        }
      },

      // Extension code...
    })

Step 2: Register Your Extension
...............................

Create a preset that includes your extension:

.. code-block:: javascript

    // myapp/static/myapp/extensions/custom-preset.js
    import {
      Document, Paragraph, Text, Bold, Italic, // etc...
      createTextareaEditor, initializeEditors,
    } from "django-prose-editor/editor"

    import MyCustomExtension from './custom-extension'

    const marker = "data-django-prose-editor-custom"

    function createEditor(textarea) {
      if (textarea.closest(".prose-editor")) return
      const config = JSON.parse(textarea.getAttribute(marker))

      const extensions = [
        Document, Paragraph, Text,
        Bold, Italic,
        // Other standard extensions...

        // Add your custom extension
        MyCustomExtension.configure({
          // Get options from the config
          option1: config["myCustomExtension.option1"],
          option2: config["myCustomExtension.option2"],
        }),
      ]

      return createTextareaEditor(textarea, extensions)
    }

    initializeEditors(createEditor, `[${marker}]`)

Step 3: Register Your Extension in Django Settings
..................................................

Register your extension group in Django settings:

.. code-block:: python

    # In settings.py
    from js_asset import JS, static_lazy

    # Register your extension group
    DJANGO_PROSE_EDITOR_EXTENSIONS = [
        {
            # JavaScript assets for this extension group
            "js": [
                static_lazy("myapp/extensions/custom-extension.js")
            ],
            # Features provided by this extension group
            "features": {
                # Reference the processor function by its dotted path
                "myCustomExtension": "myapp.extensions.process_custom_extension",
                # You can add multiple related features that share the same JS
                "myCustomExtensionDetails": "myapp.extensions.process_custom_extension_details"
            }
        }
    ]

    # For custom presets (optional - you can use the configurable preset)
    DJANGO_PROSE_EDITOR_PRESETS = {
        "custom": [
            JS("myapp/extensions/custom-preset.js", {"type": "module"}),
        ],
    }

    # Then use your extensions with the ConfigurableProseEditorField

Step 4: Use Your Custom Extension in Models
...........................................

Now you can use your custom extension in your models:

.. code-block:: python

    from django_prose_editor.fields import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            features={
                # Standard features
                "bold": True,
                "italic": True,

                # Your custom extension with configuration
                "myCustomExtension": {
                    "option1": "custom value",
                    "option2": False,
                }
            },
            # Specify which JS preset to use for custom extensions
            preset="custom"
        )

The configuration system will:

1. Enable your custom extension in the editor
2. Pass your configuration options to the extension
3. Allow the HTML elements and attributes in the sanitization process
4. Use your specified JavaScript preset to initialize the extension

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
            config: The feature configuration (e.g., {"option1": "value"})
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
    from django_prose_editor.config import create_simple_processor

    DJANGO_PROSE_EDITOR_EXTENSIONS = [
        # Complex extension group
        {
            "js": [
                static_lazy("myapp/extensions/complex-extension.js")
            ],
            "features": {
                "complexExtension": "myapp.extensions.process_complex_extension"
            }
        },

        # Simple extension group
        {
            "js": [
                static_lazy("myapp/extensions/simple-extension.js")
            ],
            "features": {
                "simpleExtension": create_simple_processor(
                    tags=["div", "span"],
                    attributes={"div": ["class"], "span": ["class"]}
                )
            }
        }
    ]

Working Principles
------------------

This configuration system bridges the gap between front-end capabilities and server-side sanitization by:

1. Defining a clear mapping between editor features and HTML elements/attributes
2. Automatically generating sanitization rules from the feature configuration
3. Supporting extension with custom components
4. Providing processor functions for complex configurations

Special Features
----------------

**Link Protocol Sanitization**

When configuring the `link` feature, you can restrict URLs to specific protocols:

.. code-block:: python

    content = ConfigurableProseEditorField(
        features={
            "link": {
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
        features={
            "heading": {
                "levels": [1, 2, 3],  # Only allow H1, H2, H3
            }
        }
    )

This configuration will only allow the specified heading levels in both the editor
and the sanitized output.

For those who need more control, you can still use the lower-level configuration options or create custom presets as described in the main documentation.
