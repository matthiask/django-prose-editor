import json
import warnings

from django import forms
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from js_asset import JS, importmap, static_lazy

from django_prose_editor.config import js_from_extensions


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

    def _convert_extension_names(self, config):
        """
        Convert legacy underscore_case extension names to Tiptap extension names.
        This maintains backward compatibility for older ProseMirror style names.
        """
        if not config or "types" not in config or not config["types"]:
            return config

        pm_to_tiptap = {
            "bullet_list": "BulletList",
            "horizontal_rule": "HorizontalRule",
            "list_item": "ListItem",
            "ordered_list": "OrderedList",
            "hard_break": "HardBreak",
            "strong": "Bold",
            "em": "Italic",
            "strikethrough": "Strike",
            "sub": "Subscript",
            "sup": "Superscript",
        }

        types = []
        old_types = {}

        for ext_type in config["types"]:
            if type := pm_to_tiptap.get(ext_type):
                types.append(type)
                old_types[ext_type] = type
            else:
                types.append(ext_type)

        if old_types:
            warnings.warn(
                f"Deprecated extension names were found in the configuration of {self.__class__}: {list(old_types.keys())}. Convert them to their new names: {list(old_types.values())}.",
                DeprecationWarning,
                stacklevel=1,
            )

        config["types"] = types
        return config

    def get_config(self):
        config = self.config or {
            "types": None,
            "history": True,
            "html": True,
            "typographic": True,
        }

        # New-style config with "extensions" key
        if isinstance(config, dict) and "extensions" in config:
            return config | {"js_modules": js_from_extensions(config["extensions"])}

        return self._convert_extension_names(config)

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
