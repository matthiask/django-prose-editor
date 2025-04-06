===============================
Editor Configuration Language
===============================

Overview
========

Django Prose Editor provides a unified configuration approach that synchronizes front-end editor capabilities with server-side sanitization rules. This ensures consistency between what users can create in the editor and what is allowed after sanitization.

Basic Configuration
==================

The configuration system uses a declarative format that defines:

1. Editor features (Tiptap extensions)
2. HTML elements and attributes allowed by these features
3. Server-side sanitization rules derived from the configuration

Example Configuration
--------------------

.. code-block:: python

    from django_prose_editor.fields import ConfigurableProseEditorField

    class Article(models.Model):
        content = ConfigurableProseEditorField(
            features={
                # Core text formatting
                "bold": True,
                "italic": True,
                "strike": True,
                "underline": True,

                # Structure
                "heading": {
                    "levels": [1, 2, 3]  # Only allow h1, h2, h3
                },
                "bulletList": True,
                "orderedList": True,
                "blockquote": True,

                # Advanced features
                "link": {
                    "allowTargetBlank": True,  # Enable "open in new window"
                    "protocols": ["http", "https", "mailto"],  # Limit protocols
                },
                "table": True,

                # Editor capabilities
                "history": True,       # Enables undo/redo
                "html": True,          # Allows HTML view
                "typographic": True,   # Enables typographic chars
            }
        )

Predefined Feature Sets
-----------------------

For convenience, several predefined feature sets are available:

.. code-block:: python

    # Minimal configuration (text formatting only)
    content = ConfigurableProseEditorField(preset="minimal")

    # Basic configuration (text + lists + links)
    content = ConfigurableProseEditorField(preset="basic")

    # Standard configuration (most features except tables)
    content = ConfigurableProseEditorField(preset="standard")

    # Full configuration (all available features)
    content = ConfigurableProseEditorField(preset="full")

You can extend predefined sets:

.. code-block:: python

    content = ConfigurableProseEditorField(
        preset="basic",
        features={
            "table": True,  # Add table support to basic preset
            "link": {
                "allowTargetBlank": False  # Override link settings
            }
        }
    )

Server-side Sanitization
========================

The configuration automatically generates appropriate sanitization rules for nh3:

.. code-block:: python

    # Automatically sanitizes based on feature configuration
    content = ConfigurableProseEditorField(
        features={"bold": True, "link": True},
        sanitize=True  # Uses the generated allowlist
    )

    # You can also access the generated rules directly
    from django_prose_editor.sanitized import generate_allowlist

    allowlist = generate_allowlist(features={"bold": True, "link": True})
    # Returns {"tags": ["strong", "a"], "attributes": {"a": ["href"]}}

Feature-to-HTML Mapping
=======================

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

Advanced Configuration
=====================

Custom Extensions
----------------

The configuration system supports custom Tiptap extensions. This allows you to extend
the editor with your own functionality while still maintaining the synchronized
sanitization between frontend and backend.

Step 1: Define Your Extension
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

First, create a JavaScript file with your custom Tiptap extension:

.. code-block:: javascript

    // myapp/static/myapp/extensions/custom-extension.js
    import { Extension } from '@tiptap/core'

    export default Extension.create({
      name: 'myCustomExtension',

      addOptions() {
        return {
          option1: 'default',
          option2: true,
        }
      },

      // Extension implementation...
    })

Step 2: Register Your Extension
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

Step 3: Register Your Extension and Preset in Django Settings
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Configure your extension and preset in your Django settings:

.. code-block:: python

    # In settings.py
    from js_asset import JS

    # Define the HTML elements and attributes your extension produces
    DJANGO_PROSE_EDITOR_EXTENSIONS = {
        "myCustomExtension": {
            "tags": ["custom"],  # HTML tags this extension creates
            "attributes": {
                "custom": ["attribute1", "attribute2"]  # Allowed attributes for each tag
            }
        }
    }

    # Register your custom preset
    DJANGO_PROSE_EDITOR_PRESETS = {
        "custom": [
            JS("myapp/extensions/custom-preset.js", {"type": "module"}),
        ],
    }

    # Set this as the preset to use when custom extensions are enabled
    DJANGO_PROSE_EDITOR_CUSTOM_PRESET = "custom"

Step 4: Use Your Custom Extension in Models
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
            }
        )

The configuration system will:

1. Enable your custom extension in the editor
2. Pass your configuration options to the extension
3. Allow the HTML elements and attributes in the sanitization process
4. Use your custom preset that knows how to initialize the extension

Implementation Details
=====================

This configuration system bridges the gap between front-end capabilities and server-side sanitization by:

1. Defining a clear mapping between editor features and HTML elements/attributes
2. Automatically generating sanitization rules from the feature configuration
3. Supporting extension with custom components

Special Features
---------------

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
