System Checks
=============

Django Prose Editor includes several system checks that help ensure your configuration is secure and follows best practices. These checks run automatically when you run ``python manage.py check`` and during the normal Django startup process.

Error Checks
-----------

The following checks will raise an ``Error`` which should be addressed before deploying your application:

.. list-table::
   :widths: 15 85
   :header-rows: 1

   * - Check ID
     - Description
   * - ``django_prose_editor.E001``
     - **Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.**

       This preset is used internally by the package and overriding it could break functionality.

       **Solution:** Remove the 'default' key from your DJANGO_PROSE_EDITOR_PRESETS setting.

   * - ``django_prose_editor.E002``
     - **Overriding the "configurable" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.**

       This preset is used internally by the package and overriding it could break functionality.

       **Solution:** Remove the 'configurable' key from your DJANGO_PROSE_EDITOR_PRESETS setting.

   * - ``django_prose_editor.E003``
     - **DJANGO_PROSE_EDITOR_EXTENSIONS must be a list of dictionaries.**

       The custom extensions setting has an invalid format.

       **Solution:** Configure DJANGO_PROSE_EDITOR_EXTENSIONS as a list of dictionaries, each with 'js' and 'extensions' keys.

   * - ``django_prose_editor.E004``
     - **Extension group at index {i} must be a dictionary.**

       Each item in the DJANGO_PROSE_EDITOR_EXTENSIONS list must be a dictionary.

       **Solution:** Make sure each extension group is a dictionary with 'js' and 'extensions' keys.

   * - ``django_prose_editor.E005``
     - **Extension group at index {i} is missing the required 'extensions' key.**

       The 'extensions' key is required for each extension group.

       **Solution:** Add an 'extensions' key mapping extension names to processors.

   * - ``django_prose_editor.E006``
     - **The 'extensions' key in extension group at index {i} must be a dictionary.**

       The 'extensions' value must be a dictionary mapping extension names to processors.

       **Solution:** Make sure the 'extensions' key contains a dictionary mapping extension names to processor callables or dotted paths.

   * - ``django_prose_editor.E007``
     - **Processor for extension "{extension_name}" in group {i} must be a callable or a dotted path string.**

       Extension processors must be either callables or dotted import paths to callable functions.

       **Solution:** Provide either a callable or a dotted import path for the processor.

   * - ``django_prose_editor.E008``
     - **The 'js' key in extension group at index {i} must be a list.**

       The 'js' key should contain a list of JavaScript assets.

       **Solution:** Make sure the 'js' key is a list of JavaScript asset URLs.

Warning Checks
-------------

The following checks will raise a ``Warning`` which indicates potential issues that should be addressed:

.. list-table::
   :widths: 15 85
   :header-rows: 1

   * - Check ID
     - Description
   * - ``django_prose_editor.W001``
     - **This ProseEditorField is using the legacy configuration format which is deprecated.**

       The 'config' parameter without the 'extensions' key is deprecated and will be removed in a future version.

       **Solution:** Add the 'extensions' parameter explicitly to use the new configuration format. For example:

       .. code-block:: python

           content = ProseEditorField(
               config={"extensions": {"Bold": True, "Italic": True}},
               sanitize=True
           )

   * - ``django_prose_editor.W002``
     - **Extension group at index {i} is missing the 'js' key.**

       Each extension group should have a 'js' key listing JavaScript assets.

       **Solution:** Add a 'js' key with a list of JavaScript assets for the extensions.

   * - ``django_prose_editor.W003``
     - **Processor path "{processor}" for extension "{extension_name}" in group {i} may not be a valid dotted import path.**

       The processor string doesn't look like a valid Python dotted import path.

       **Solution:** The processor should be a dotted import path like 'myapp.processors.my_processor'.

   * - ``django_prose_editor.W004``
     - **This ProseEditorField is using extensions without sanitization.**

       When using extensions, it's recommended to enable sanitization for security.

       **Solution:** Add ``sanitize=True`` to your field definition:

       .. code-block:: python

           content = ProseEditorField(
               config={"extensions": {"Bold": True, "Italic": True}},
               sanitize=True
           )

       For legacy configurations (without extensions), convert to the extension mechanism with sanitization:

       .. code-block:: python

           # From this:
           content = ProseEditorField(config={"types": ["Bold", "Italic"]})

           # To this:
           content = ProseEditorField(
               config={"extensions": {"Bold": True, "Italic": True}},
               sanitize=True
           )

Running the Checks
-----------------

System checks run automatically during normal Django operation, but you can also run them manually:

.. code-block:: shell

    python manage.py check django_prose_editor

This will display any warnings or errors specific to the django-prose-editor application.
