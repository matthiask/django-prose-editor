from django.conf import settings
from django.core.checks import Error, register


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
