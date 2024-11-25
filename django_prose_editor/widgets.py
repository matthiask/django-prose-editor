import json

from django import forms
from django.utils.translation import gettext
from js_asset.js import JS


class ProseEditorWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        super().__init__(*args, **kwargs)

    @property
    def media(self):
        return forms.Media(
            css={
                "screen": [
                    "django_prose_editor/material-icons.css",
                    "django_prose_editor/editor.css",
                ]
            },
            js=[
                "django_prose_editor/editor.js",
                JS(
                    "django_prose_editor/init.js",
                    {
                        "data-messages": json.dumps(
                            {
                                "url": gettext("URL"),
                                "title": gettext("Title"),
                                "update": gettext("Update"),
                                "cancel": gettext("Cancel"),
                            }
                        ),
                    },
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
        context["widget"]["attrs"]["data-django-prose-editor"] = json.dumps(
            self.get_config(),
            separators=(",", ":"),
        )
        return context


class AdminProseEditorWidget(ProseEditorWidget):
    class Media:
        css = {"screen": ["django_prose_editor/overrides.css"]}
