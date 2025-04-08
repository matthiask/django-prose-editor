Usage outside the Django admin
==============================

The prose editor can easily be used outside the Django admin. The form field
respectively the widget includes the necessary CSS and JavaScript:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorFormField

    class Form(forms.Form):
        text = ProseEditorFormField()

Or maybe you want to use ``django_prose_editor.widgets.ProseEditorWidget``, but
why make it more complicated than necessary.

If you're rendering the form in a template you have to include the form media:

.. code-block:: html+django

    <form method="post">
      {% csrf_token %}
      {{ form.media }}  {# This is the important line! #}

      {{ form.errors }} {# Always makes sense #}
      {{ form.as_div }}
      <button type="submit">send</button>
    </form>

Note that the form media isn't django-prose-editor specific, that's a Django
feature.

The django-prose-editor CSS uses the following CSS custom properties.

* ``--prose-editor-background``
* ``--prose-editor-foreground``
* ``--prose-editor-border-color``
* ``--prose-editor-active-color``
* ``--prose-editor-disabled-color``

If you do not set them, they get their value from the following properties that
are defined in the Django admin's CSS:

* ``--border-color``
* ``--body-fg``
* ``--body-bg``
* ``--primary``

You should set these properties with appropriate values to use
django-prose-editor outside the admin in your site.

In addition, you may optionally set a ``--prose-editor-typographic`` property
to control the color of typographic characters when shown.
