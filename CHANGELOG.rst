Change log
==========

Next version
~~~~~~~~~~~~


0.6 (2024-07-26)
~~~~~~~~~~~~~~~~

- Added support for highlighting soft hyphens.
- Updated all dependencies.
- Moved the Django administration interface CSS overrides into their own file,
  and only load them if necessary so that using the editor outside the admin
  requires using  less ``!important`` overrides.


0.5 (2024-07-08)
~~~~~~~~~~~~~~~~

- Updated all dependencies.
- Stopped putting anything into the global scope in ``init.js``.
- Added support for showing typographic characters.
- Changed the editor initialization to make the initial ``textarea`` a child of
  the ``.prose-editor`` div, and changed the CSS to ``display: none
  !important;`` so that the ``textarea`` is only shown in exceptional
  circumstances, when people really really want it.


0.4 (2024-05-26)
~~~~~~~~~~~~~~~~

- Allowed installing the package in Python 3.10 environments too.
- Tweaked the cleaning methods of ``ProseEditorField`` and
  ``SanitizedProseEditorField`` to produce empty strings when no content is
  entered. Previously they would produce an empty paragraph (``<p></p>``) since
  our ProseMirror schema says that there exists always one or more block nodes.
- Stopped setting a black color on the ``.ProseMirror`` class by default.
- Dropped the dependency on ``admin/js/jquery.init.js``. We're using our own
  DOM-ready handler and therefore can still access ``django.jQuery`` to hook up
  the inline events handler if running inside the Django admin.
- Moved the paragraph formats into a popover.


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
