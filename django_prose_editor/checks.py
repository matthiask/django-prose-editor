from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def check_js_preset_configuration(app_configs, **kwargs):
    """
    Check that the 'default' JavaScript preset is not being overridden in settings.
    """
    errors = []

    # Main setting
    if hasattr(settings, "DJANGO_PROSE_EDITOR_PRESETS"):
        presets = settings.DJANGO_PROSE_EDITOR_PRESETS
        if "default" in presets:
            errors.append(
                Error(
                    'Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
                    hint="Remove the 'default' key from your DJANGO_PROSE_EDITOR_PRESETS setting.",
                    obj=settings,
                    id="django_prose_editor.E001",
                )
            )

        if "configurable" in presets:
            errors.append(
                Error(
                    'Overriding the "configurable" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
                    hint="Remove the 'configurable' key from your DJANGO_PROSE_EDITOR_PRESETS setting.",
                    obj=settings,
                    id="django_prose_editor.E002",
                )
            )

    return errors


@register()
def check_custom_extensions_configuration(app_configs, **kwargs):
    """
    Check that custom extensions are properly configured.
    """
    errors = []

    # Check if custom extensions are defined
    if hasattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS"):
        extensions = settings.DJANGO_PROSE_EDITOR_EXTENSIONS

        # Check that each extension has a valid processor
        for ext_name, ext_processor in extensions.items():
            # Check if the processor is a string (dotted path) or callable
            if not (callable(ext_processor) or isinstance(ext_processor, str)):
                errors.append(
                    Error(
                        f'Custom extension "{ext_name}" processor must be a callable or a dotted path string.',
                        hint="Each custom extension must have a processor that is either a callable or a dotted import path.",
                        obj=settings,
                        id="django_prose_editor.E003",
                    )
                )

            # If it's a string, verify it looks like a dotted path
            if isinstance(ext_processor, str) and "." not in ext_processor:
                errors.append(
                    Warning(
                        f'Custom extension "{ext_name}" processor path "{ext_processor}" may not be a valid dotted import path.',
                        hint="The processor should be a dotted import path like 'myapp.processors.my_processor'.",
                        obj=settings,
                        id="django_prose_editor.W002",
                    )
                )

    return errors
