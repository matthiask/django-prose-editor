import json

from django import forms
from django.conf import settings
from django.templatetags.static import static
from django.utils.translation import gettext_lazy
from js_asset import JS, JSON, importmap


importmap.update(
    {"imports": {"django-prose-editor/editor": static("django_prose_editor/editor.js")}}
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
                importmap,
                JSON(
                    {
                        "stylesheets": [
                            static("django_prose_editor/material-icons.css"),
                            static("django_prose_editor/editor.css"),
                        ],
                        "messages": {
                            "url": gettext_lazy("URL"),
                            "title": gettext_lazy("Title"),
                            "update": gettext_lazy("Update"),
                            "cancel": gettext_lazy("Cancel"),
                        },
                    },
                    id="django-prose-editor-settings",
                ),
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
        return {
            "default": [
                JS("django_prose_editor/editor.js", {"type": "module"}),
                JS("django_prose_editor/default.js", {"type": "module"}),
            ],
        } | getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {})

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
    @property
    def base_media(self):
        return super().base_media + forms.Media(
            css={
                "all": [
                    "django_prose_editor/editor.css",  # For the ordering
                    "django_prose_editor/overrides.css",
                ]
            }
        )
