===================
django-prose-editor
===================

Prose editor for the Django admin based on ProseMirror


Cookie control
==============

Some jurisidictions require the the users' consent before adding analytics
scripts and tracking cookies. While it may be best to not use any analytics and
tracking at all this may not be possible or even desirable in all
circumstances.

Many solutions exist for adding a consent banner to the website. Some of those
banners require loading JavaScript and other assets from external servers. This
raises some questions because loading those scripts may also be seen as
tracking already. It is certainly safer to implement a cookie control panel
locally. It would be boring to start from scratch on each site.

This guide explains how to use `feincms3-cookiecontrol <https://github.com/feinheit/feincms3-cookiecontrol/>`__.

Installation
~~~~~~~~~~~~

Install the package:

.. code-block:: shell

    venv/bin/pip install django-prose-editor

Add ``django_prose_editor`` to ``INSTALLED_APPS``:

.. code-block:: python

    INSTALLED_APPS = [
        # ...
        "django_prose_editor",
    ]

Replace ``models.TextField`` with ``ProseEditorField`` where appropriate:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Project(models.Model):
        description = ProseEditorField()

Note! No migrations will be generated when switching from and to
``models.TextField``. That's by design. Those migrations are mostly annoying.


Customization
~~~~~~~~~~~~~

It's not possible (yet), sorry.
