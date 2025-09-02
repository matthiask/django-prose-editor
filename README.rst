===================
django-prose-editor
===================

Prose editor for the Django admin based on ProseMirror and Tiptap. `Announcement blog post <https://406.ch/writing/django-prose-editor-prose-editing-component-for-the-django-admin/>`__.


Intro
=====

After installing the package (using ``pip install
django-prose-editor[sanitize]``) the following should get you started:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "BulletList": True,
            "ListItem": True,
            "Link": True,
        },
        sanitize=True,  # Server side sanitization is strongly recommended.
    )

Check the `documentation <https://django-prose-editor.readthedocs.io>`__.
