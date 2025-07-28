Menu configuration
==================

Menu items are defined as follows:

.. code-block:: javascript

    menu.defineItem({
      name: "name",
      groups: "group1 group2 group3",
      // Higher priorities are sorted first
      priority: 100,
      // Apply the command:
      command(editor) {},
      // Is the item enabled?
      enabled(editor) { return true },
      // Should the item be shown as active, e.g. because the selection is inside
      // a node or mark of this particular type?
      active(editor) { return false },
      // Should this item be dynamically hidden?
      hidden(editor) { return false },
      // Run arbitrary updates
      update(editor) {}

      // Button: Element when shown in toolbar
      button: HTMLElement,
      // Option: Element when shown in dropdown
      option: HTMLElement | null,
    })

Most of these are optional; the keys without which a menu item definition
doesn't make much sense are ``groups``, ``command`` and ``button``.

Menu items can be used as follows:

.. code-block:: javascript

    // Return a button group
    const group = menu.buttonGroup({ editor, buttons }, menu.items("blockType"))

    // Return a dropdown
    const dropdown = menu.dropdown({ editor, buttons }, menu.items("formats"))

    // Create a group from all node menu items except those also contained in
    // blockType:
    const group = buttonGroup(menuItems("nodes -blockType"))

Menu item creators are functions passed to ``Menu.configure``; those creators
receive ``{ editor, buttons }`` and are responsible for returning a full menu.

.. code-block:: javascript

    // Create a full menu
    function createMenu({ editor, buttons, menu }) {
        const groups = [
            "blockType",
            "nodes",
            "marks",
            "link",
            "history",
            "utility",
        ]
        return groups.map((group) =>
            menu.buttonGroup({ editor, buttons }, menu.items(group))
        )
    }

    Menu.configure({
        items: createMenu,
    })
