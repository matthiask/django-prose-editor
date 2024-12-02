import json

from django import forms
from django.conf import settings
from django.forms.utils import flatatt
from django.templatetags.static import static
from django.utils.html import format_html, json_script, mark_safe
from django.utils.translation import gettext


class JS:
    def __init__(self, src, attrs):
        self.src = src
        self.attrs = attrs

    def __html__(self):
        return format_html(
            '<script src="{}"{}></script>',
            self.src
            if self.src.startswith(("http://", "https://", "/"))
            else static(self.src),
            mark_safe(flatatt(self.attrs)),
        )

    def __eq__(self, other):
        return (
            isinstance(other, JS)
            and self.src == other.src
            and self.attrs == other.attrs
        )

    def __hash__(self):
        return hash(self.__str__())


class JSON:
    def __init__(self, id, data):
        self.id = id
        self.data = data

    def __html__(self):
        return json_script(self.data, self.id)

    def __eq__(self, other):
        return (
            isinstance(other, JSON) and self.id == other.id and self.data == other.data
        )

    def __hash__(self):
        return hash(self.__str__())


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
                JSON(
                    "django-prose-editor-settings",
                    {
                        "messages": {
                            "url": gettext("URL"),
                            "title": gettext("Title"),
                            "update": gettext("Update"),
                            "cancel": gettext("Cancel"),
                        },
                    },
                ),
                *(
                    JS(
                        preset["script"],
                        {"defer": True},
                    )
                    for key, preset in self.get_presets().items()
                ),
            ],
        )

    def get_presets(self):
        presets = {
            "default": {
                "script": "django_prose_editor/init.js",
            },
        }
        return presets | getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {})

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
