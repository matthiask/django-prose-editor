import json

from django import forms
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from js_asset import JS, importmap, static_lazy

from django_prose_editor.config import expand_extensions, js_from_extensions


importmap.update(
    {
        "imports": {
            "django-prose-editor/editor": static_lazy("django_prose_editor/editor.js"),
            "django-prose-editor/configurable": static_lazy(
                "django_prose_editor/configurable.js"
            ),
        }
    }
)


class ProseEditorWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        self.preset = kwargs.pop("preset", "default")
        super().__init__(*args, **kwargs)

    @property
    def base_media(self):
        return forms.Media(
            css={
                "all": [
                    "django_prose_editor/material-icons.css",
                    "django_prose_editor/editor.css",
                ]
            },
            js=[
                # We don't really need this since editor.js will be loaded
                # in default.js (or other presets' modules) anyway, but keeping
                # the tag around helps the browser discover and load this
                # module a little bit earlier.
                JS("django_prose_editor/editor.js", {"type": "module"}),
            ],
        )

    @property
    def media(self):
        return self.base_media + forms.Media(
            js=[
                JS("django_prose_editor/editor.js", {"type": "module"}),
                *self.get_presets()[self.preset],
            ]
        )

    def get_presets(self):
        presets = getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {})
        # The system check in checks.py will catch this error during startup
        return presets | {
            "default": [
                JS("django_prose_editor/editor.js", {"type": "module"}),
                JS("django_prose_editor/default.js", {"type": "module"}),
            ],
            "configurable": [
                JS("django_prose_editor/editor.js", {"type": "module"}),
                JS("django_prose_editor/configurable.js", {"type": "module"}),
            ],
        }

    def get_config(self):
        config = self.config or {
            "types": None,
            "history": True,
            "html": True,
            "typographic": True,
        }

        # New-style config with "extensions" key
        if isinstance(config, dict) and "extensions" in config:
            config = config | {
                "extensions": expand_extensions(config["extensions"]),
                "js_modules": js_from_extensions(config["extensions"]),
            }

        return config

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context["widget"]["attrs"][f"data-django-prose-editor-{self.preset}"] = (
            json.dumps(self.get_config(), separators=(",", ":"), cls=DjangoJSONEncoder)
        )
        return context


class AdminProseEditorWidget(ProseEditorWidget):
    @property
    def base_media(self):
        return super().base_media + forms.Media(
            css={
                "all": [
                    "django_prose_editor/editor.css",  # For the ordering
                    "django_prose_editor/overrides.css",
                ]
            },
            js=[
                importmap,  # Sneak the importmap into the admin <head>
                JS("django_prose_editor/editor.js", {"type": "module"}),
            ],
        )
