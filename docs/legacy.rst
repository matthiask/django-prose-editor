Legacy Configuration
====================

Old Approach
------------

The ``SanitizedProseEditorField`` is a legacy class that automatically enables
sanitization but uses a broad sanitization approach that allows most HTML elements.
While secure from XSS, it's not tailored to your specific extensions:

.. code-block:: python

    from django_prose_editor.sanitized import SanitizedProseEditorField

    description = SanitizedProseEditorField()  # Not recommended

Instead, it's strongly recommended to use the extension-aware sanitization approach:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    description = ProseEditorField(
        extensions={"Bold": True, "Italic": True, "Link": True},
        sanitize=True  # Uses sanitization rules specific to these extensions
    )

This provides better security by only allowing the specific HTML elements and attributes
needed by your enabled extensions.

You can also pass your own callable receiving and returning HTML
using the ``sanitize`` keyword argument if you need custom sanitization logic.

Simple Customization with Config (Deprecated)
---------------------------------------------

For basic customization, you can use the ``config`` parameter to specify which
extensions should be enabled. This was the only available way to configure the
prose editor up to version 0.9. It's now deprecated because using the
``extensions`` mechanism documented above is much more powerful, integrated and
secure.

This legacy approach doesn't support sanitization at all.

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
            config={
                "types": [
                    "Bold", "Italic", "Strike", "BulletList", "OrderedList",
                    "HorizontalRule", "Link",
                ],
                "history": True,
                "html": True,
                "typographic": True,
            }
        )

All extension names now use the Tiptap names (e.g., ``Bold``, ``Italic``,
``BulletList``, ``HorizontalRule``). For backward compatibility, the following legacy
ProseMirror-style names are still supported:

* Legacy node names: ``bullet_list`` → ``BulletList``, ``ordered_list`` →
  ``OrderedList``, ``horizontal_rule`` → ``HorizontalRule``
* Legacy mark names: ``strong`` → ``Bold``, ``em`` → ``Italic``,
  ``strikethrough`` → ``Strike``, ``sub`` → ``Subscript``, ``sup`` → ``Superscript``,
  ``link`` → ``Link``

Note that when using the legacy format, lists and tables automatically include
the extensions they depend on.
