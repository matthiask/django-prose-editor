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
    import { materialMenuButton } from "./menu.js"

    export const MyExtension = SomeBaseExtension.extend({
      addOptions() {
        return {
          ...this.parent?.(),
          // Your extension options here
        }
      },

      addCommands() {
        // Register menu items for this extension
        this.editor.storage.menu.addItems("myExtension", menuItems)

        return {
          ...this.parent?.(),
          // Your commands here
        }
      },
    })

    // Define menu items as a function that returns an array of menu items
    const menuItems = () => [
      {
        command(editor) {
          // Command to execute when menu item is clicked
          editor.chain().myCommand().focus().run()
        },
        dom: materialMenuButton("icon_name", "tooltip text"),
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

Use the ``addItems`` method from the menu storage to add your menu items:

.. code-block:: javascript

    // In your extension's addCommands method
    this.editor.storage.menu.addItems("groupName", menuItems)

The ``addItems`` method takes the following parameters:

1. ``group``: The name of the menu group to add items to
2. ``items``: A function that returns an array of menu item objects
3. ``before``: (Optional) Insert this group before another group

Note that items should be defined outside the extension so that its identity is
stable, otherwise the menu items will be duplicated, at least that's true for
now.

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
~~~~~~~~~~~~~~~~~~~~

The menu module provides helper functions for creating menu buttons:

.. code-block:: javascript

    import { materialMenuButton, svgMenuButton } from "./menu.js"

    // Create a button with a Material Icon
    const button1 = materialMenuButton("icon_name", "tooltip text")

    // Create a button with SVG content
    const button2 = svgMenuButton(`<svg>...</svg>`, "tooltip text")

Examples
--------

Check the bundled Link and Table extensions for examples.

Best Practices
-------------

1. **Group Related Items**: Use the menu group system to organize related items together
2. **Conditional Display**: Use the ``hidden``, ``enabled``, and ``active`` methods to control when and how menu items appear
3. **Internationalization**: Use the ``gettext`` utility for translatable text
4. **Use Dialogs**: For complex interactions, use the ``updateAttrsDialog`` utility to create configuration dialogs
5. **Follow Patterns**: Follow the patterns established by existing extensions
6. **Add Keyboard Shortcuts**: Include keyboard shortcuts for important commands
