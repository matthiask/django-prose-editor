Change log
==========

Next version
~~~~~~~~~~~~

- Allowed installing the package in Python 3.10 environments too.


0.3 (2024-04-09)
~~~~~~~~~~~~~~~~

- Made the editor usable in dark mode.
- Changed the cancel buttons in dialogs to not validate the form.
- Switched the ``SanitizedProseEditorField`` from html-sanitizer (which at the
  moment uses the problematic lxml HTML cleaner under the hood) with `nh3
  <https://nh3.readthedocs.io/en/latest/>`__. html-sanitizer is still a good
  choice but since we build on ProseMirror we only require a sanitizer, we
  don't have to clean up strange HTML.
- Added customization options to the fields and widgets.


0.2 (2024-03-12)
~~~~~~~~~~~~~~~~

- Extended the README.
- Fixed the initialization in Django admin inlines.
- Added a server-side sanitization callback to the ``ProseEditorField``, and
  added ``django_prose_editor.sanitized.SanitizedProseEditorField`` which
  automatically does the right thing.
- Automatically added a ``get_*_excerpt`` model method to models using the
  ``ProseEditorField`` as a convenience.
- Cleaned up the styles.
- Added a maximum width to the editor.
- Started hiding labels for prose editor fields in the Django admin if the
  label is an empty string. This looks better to me.
- Added a shortcut for adding links.
- Added a button for editing the raw HTML. This is sometimes useful.
- Stopped generating source maps unless in dev mode. I like source maps a lot
  in general, but the files are really big in this case.
- Added a button to the menu to insert horizontal rules.
- Added material icons for the format bar.
- Added client side validation to dialogs.
- Upgraded esbuild.


0.1 (2024-03-11)
~~~~~~~~~~~~~~~~

- Initial public release.
