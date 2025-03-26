import json
import warnings

from django import forms
from django.conf import settings
from js_asset import JS, importmap, static_lazy


importmap.update(
    {
        "imports": {
            "django-prose-editor/editor": static_lazy("django_prose_editor/editor.js"),
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
                # in default.js (or other preset's modules) anyway, but keeping
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
        settings_presets = getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {})
        # The system check in checks.py will catch this error during startup
        return settings_presets | {
            "default": [
                JS("django_prose_editor/editor.js", {"type": "module"}),
                JS("django_prose_editor/default.js", {"type": "module"}),
            ],
        }

    def _convert_extension_names(self, config):
        """
        Convert underscore_case extension names to camelCase.
        This maintains backward compatibility while encouraging the new style.
        """
        if not config or "types" not in config or not config["types"]:
            return config

        pm_to_tiptap = {
            # Node names
            "bullet_list": "bulletList",
            "horizontal_rule": "horizontalRule",
            "list_item": "listItem",
            "ordered_list": "orderedList",
            "hard_break": "hardBreak",
            # Mark names
            "strong": "bold",
            "em": "italic",
            "strikethrough": "strike",
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

        return self._convert_extension_names(config)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context["widget"]["attrs"][f"data-django-prose-editor-{self.preset}"] = (
            json.dumps(
                self.get_config(),
                separators=(",", ":"),
            )
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
