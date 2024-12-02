import json

from django import forms
from django.conf import settings
from django.utils.translation import gettext
from js_asset.js import JS


def _get_presets():
    presets = {
        "default": {
            "script": "django_prose_editor/init.js",
        },
    }
    return presets | getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {})


class ProseEditorWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        self.preset = kwargs.pop("preset", "default")
        super().__init__(*args, **kwargs)

    @property
    def media(self):
        return forms.Media(
            css={
                "all": [
                    "django_prose_editor/material-icons.css",
                    "django_prose_editor/editor.css",
                ]
            },
            js=[
                JS(
                    "django_prose_editor/editor.js",
                    {"defer": True},
                ),
                *(
                    JS(
                        preset["script"],
                        {
                            "defer": True,
                            "data-config": json.dumps(
                                {
                                    "messages": {
                                        "url": gettext("URL"),
                                        "title": gettext("Title"),
                                        "update": gettext("Update"),
                                        "cancel": gettext("Cancel"),
                                    },
                                }
                            ),
                        },
                    )
                    for key, preset in _get_presets().items()
                ),
            ],
        )

    def get_config(self):
        return self.config or {
            "types": None,
            "history": True,
            "html": True,
            "typographic": True,
        }

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
    class Media:
        css = {"all": ["django_prose_editor/overrides.css"]}
