from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def check_js_implementation_configuration(app_configs, **kwargs):
    """
    Check that the 'default' JavaScript implementation is not being overridden in settings.
    """
    errors = []

    # Check new setting
    if hasattr(settings, "DJANGO_PROSE_EDITOR_IMPLEMENTATIONS"):
        implementations = settings.DJANGO_PROSE_EDITOR_IMPLEMENTATIONS
        if "default" in implementations:
            errors.append(
                Error(
                    'Overriding the "default" implementation in DJANGO_PROSE_EDITOR_IMPLEMENTATIONS is not allowed.',
                    hint="Remove the 'default' key from your DJANGO_PROSE_EDITOR_IMPLEMENTATIONS setting.",
                    obj=settings,
                    id="django_prose_editor.E001",
                )
            )

    # For backward compatibility, also check old setting
    if hasattr(settings, "DJANGO_PROSE_EDITOR_PRESETS"):
        presets = settings.DJANGO_PROSE_EDITOR_PRESETS
        if "default" in presets:
            errors.append(
                Error(
                    'Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
                    hint="Use DJANGO_PROSE_EDITOR_IMPLEMENTATIONS instead and remove the 'default' key.",
                    obj=settings,
                    id="django_prose_editor.E001",
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

        # Check that each extension has required configuration
        for ext_name, ext_config in extensions.items():
            if not isinstance(ext_config, dict):
                errors.append(
                    Error(
                        f'Custom extension "{ext_name}" configuration must be a dictionary.',
                        hint="Each custom extension must have a dictionary configuration.",
                        obj=settings,
                        id="django_prose_editor.E003",
                    )
                )
                continue

            # Check for required keys
            if "tags" not in ext_config:
                errors.append(
                    Warning(
                        f'Custom extension "{ext_name}" is missing the "tags" configuration.',
                        hint="Define which HTML tags this extension can produce in the 'tags' key.",
                        obj=settings,
                        id="django_prose_editor.W002",
                    )
                )

            if "attributes" not in ext_config:
                errors.append(
                    Warning(
                        f'Custom extension "{ext_name}" is missing the "attributes" configuration.',
                        hint="Define which HTML attributes this extension can produce in the 'attributes' key.",
                        obj=settings,
                        id="django_prose_editor.W003",
                    )
                )

            # Check that attributes is properly formatted
            if "attributes" in ext_config and not isinstance(
                ext_config["attributes"], dict
            ):
                errors.append(
                    Error(
                        f'Custom extension "{ext_name}" has invalid "attributes" configuration. It must be a dictionary.',
                        hint="The 'attributes' configuration should be a dictionary mapping tag names to lists of allowed attributes.",
                        obj=settings,
                        id="django_prose_editor.E004",
                    )
                )

    return errors
