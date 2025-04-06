from django.conf import settings
from django.core.checks import Error, Warning, register


@register()
def check_presets_configuration(app_configs, **kwargs):
    """
    Check that the 'default' preset is not being overridden in settings.
    """
    errors = []

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

        # If we have extensions, we should also have DJANGO_PROSE_EDITOR_CUSTOM_PRESET
        if extensions and not hasattr(settings, "DJANGO_PROSE_EDITOR_CUSTOM_PRESET"):
            errors.append(
                Warning(
                    "Custom extensions are defined but DJANGO_PROSE_EDITOR_CUSTOM_PRESET is not set.",
                    hint="Set DJANGO_PROSE_EDITOR_CUSTOM_PRESET to the name of a preset that includes your custom extensions.",
                    obj=settings,
                    id="django_prose_editor.W001",
                )
            )

        # If we have a custom preset setting, check that it exists in DJANGO_PROSE_EDITOR_PRESETS
        if hasattr(settings, "DJANGO_PROSE_EDITOR_CUSTOM_PRESET") and hasattr(
            settings, "DJANGO_PROSE_EDITOR_PRESETS"
        ):
            preset_name = settings.DJANGO_PROSE_EDITOR_CUSTOM_PRESET
            presets = settings.DJANGO_PROSE_EDITOR_PRESETS

            if preset_name not in presets:
                errors.append(
                    Error(
                        f'DJANGO_PROSE_EDITOR_CUSTOM_PRESET is set to "{preset_name}" but this preset is not defined.',
                        hint=f"Add '{preset_name}' to your DJANGO_PROSE_EDITOR_PRESETS setting.",
                        obj=settings,
                        id="django_prose_editor.E002",
                    )
                )

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
