Custom Extensions and Menu Integration
===============================

Creating custom extensions for django-prose-editor allows you to extend the editor with new functionality and integrate it with the menu system. This guide explains how to create custom extensions and add menu items for them.

Basic Extension Structure
------------------------

Extensions in django-prose-editor are based on Tiptap extensions. To create a custom extension:

1. Extend an existing extension or create a new one
2. Add menu items using the editor's menu storage system
3. Implement commands for your extension

Here's a simplified example of an extension structure:

.. code-block:: javascript

    import { SomeBaseExtension } from "@tiptap/extension-base"

    export const MyExtension = SomeBaseExtension.extend({
      addOptions() {
        return {
          ...this.parent?.(),
          // Your extension options here
        }
      },

      addMenuItems({ addItems }) {
        // Register menu items for this extension
        addItems("myExtension", menuItems)
      },

      addCommands() {
        return {
          ...this.parent?.(),
          // Your commands here
        }
      },
    })

    // Define menu items as a function that returns an array of menu items
    const menuItems = ({ buttons }) => [
      {
        command(editor) {
          // Command to execute when menu item is clicked
          editor.chain().myCommand().focus().run()
        },
        dom: buttons.material("icon_name", "tooltip text"),
        enabled(editor) {
          // Determine if the menu item should be enabled
          return true
        },
        active(editor) {
          // Determine if the menu item should appear active
          return editor.isActive("myExtension")
        },
        hidden(editor) {
          // Determine if the menu item should be hidden
          return false
        }
      },
      // Additional menu items...
    ]

Menu Integration
----------------

The Menu extension provides a system for organizing menu items into groups. You can add your items to existing groups or create new groups.

Adding Items to the Menu
~~~~~~~~~~~~~~~~~~~~~~~~

Extensions can integrate with the menu system by implementing the ``addMenuItems`` method. This method is automatically called during editor initialization and provides access to the menu's ``addItems`` function:

.. code-block:: javascript

    export const MyExtension = SomeBaseExtension.extend({
      addMenuItems({ addItems }) {
        // Register menu items for this extension
        addItems("myExtension", menuItems)
      },
    })

The ``addMenuItems`` method receives an object with the following properties:

- ``addItems``: Function to register menu items with the menu system

The ``addItems`` function takes the following parameters:

1. ``group``: The name of the menu group to add items to
2. ``items``: A function that returns an array of menu item objects
3. ``before``: (Optional) Insert this group before another group

Menu items should be defined as a separate function outside the extension to ensure stable identity and prevent duplication.

Menu Item Structure
~~~~~~~~~~~~~~~~~~

Each menu item should be an object with the following properties:

- ``command``: A function that takes the editor instance and performs an action
- ``dom``: The DOM element representing the menu button
- ``enabled``: (Optional) Function that returns a boolean indicating if the item should be enabled
- ``active``: (Optional) Function that returns a boolean indicating if the item should appear active
- ``hidden``: (Optional) Function that returns a boolean indicating if the item should be hidden
- ``update``: (Optional) Function to update dynamic content in the menu item

Creating Menu Buttons
~~~~~~~~~~~~~~~~~~~~~

The menu module provides helper functions for creating menu buttons:

.. code-block:: javascript

    // Create a button with a Material Icon
    const button1 = buttons.material("icon_name", "tooltip text")

    // Create a button with SVG content
    const button2 = buttons.svg(`<svg>...</svg>`, "tooltip text")

Examples
--------

Here are real examples from the bundled extensions:

Link Extension
~~~~~~~~~~~~~~

The Link extension demonstrates basic menu integration:

.. code-block:: javascript

    export const Link = BaseLink.extend({
      addMenuItems({ addItems }) {
        addItems("link", menuItems)
      },
    })

    const menuItems = ({ buttons }) => [
      {
        command(editor) {
          editor.chain().addLink().focus().run()
        },
        enabled(editor) {
          return !editor.state.selection.empty || editor.isActive("link")
        },
        dom: buttons.material("insert_link", "insert link"),
        active(editor) {
          return editor.isActive("link")
        },
      },
      {
        command(editor) {
          editor.chain().focus().unsetLink().run()
        },
        dom: buttons.material("link_off", "remove link"),
        hidden(editor) {
          return !editor.isActive("link")
        },
      },
    ]


Configurable Extensions
-----------------------

The configurable preset allows you to add custom Tiptap extensions without
having to create a custom preset. You can define extension groups in your
Django settings, with each group containing related extensions that share the
same JavaScript assets:

.. code-block:: python

    # In settings.py
    from js_asset import static_lazy
    from django_prose_editor.config import html_tags

    # Define your custom extensions with their processors
    DJANGO_PROSE_EDITOR_EXTENSIONS = [
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


The JavaScript module should export the extension as a named export. Here's a
minimal example of a custom extension that adds a blue color to bold text:

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
                # Enable the blue bold extension
                "BlueBold": True
            }
        )


Custom Processor Functions
--------------------------

Extensions have two important parts: Editor extensions mapping to a processor
function which defines allowed tags and attributes for each editor extension
and a list of JavaScript modules implementing the editor part of said
extensions.

The base case of a hardcoded list of tags and attributes is handled by the
``html_tags`` helper.

.. code-block:: python

    # Example processor function in myapp/extensions.py
    def process_complex_extension(config, nh3_config):
        """
        Process custom extension configuration for sanitization.

        Args:
            config: The extension configuration (e.g., {"option1": "value"})
            nh3_config: The shared configuration dictionary to update
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

        # Add tags and attributes to the nh3 config
        add_tags_and_attributes(nh3_config, tags, attributes)

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

Best Practices
-------------

1. **Group Related Items**: Use the menu group system to organize related items together
2. **Conditional Display**: Use the ``hidden``, ``enabled``, and ``active`` methods to control when and how menu items appear
3. **Internationalization**: Use the ``gettext`` utility for translatable text
4. **Use Dialogs**: For complex interactions, use the ``updateAttrsDialog`` utility to create configuration dialogs
5. **Follow Patterns**: Follow the patterns established by existing extensions
6. **Add Keyboard Shortcuts**: Include keyboard shortcuts for important commands
