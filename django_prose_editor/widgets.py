import json
from dataclasses import dataclass
from typing import Any

from django import forms
from django.conf import settings
from django.templatetags.static import static
from django.utils.html import html_safe, json_script, mark_safe
from django.utils.translation import gettext_lazy
from js_asset import CSS, JS, JSON


# See https://code.djangoproject.com/ticket/36104
orig_forms_media_add = forms.Media.__add__


def forms_media_add(self, other):
    if type(other) is not forms.Media:
        return NotImplemented
    return orig_forms_media_add(self, other)


forms.Media.__add__ = forms_media_add


@html_safe
@dataclass(eq=True)
class ImportMap:
    map: dict[str, Any]

    def __hash__(self):
        return hash(json.dumps(self.map, sort_keys=True))

    def __str__(self):
        return ""


class ExtendedMedia(forms.Media):
    def __init__(self, assets=None):
        self._asset_lists = []
        if assets:
            self._asset_lists.append(assets)

    def render(self):
        assets = self.merge(*self._asset_lists)

        importmaps = [asset for asset in assets if isinstance(asset, ImportMap)]

        return mark_safe(
            self.render_importmap(importmaps)
            + "\n".join(asset.__html__() for asset in assets)
        )

    def render_importmap(self, maps):
        if not maps:
            return ""
        result = {}
        for map in maps:
            if imports := map.map.get("imports"):
                result.setdefault("imports", {}).update(imports)
            if integrity := map.map.get("integrity"):
                result.setdefault("integrity", {}).update(integrity)
            if scopes := map.map.get("scopes"):
                for scope, imports in scopes.items():
                    result.setdefault("scopes", {}).setdefault(scope, {}).update(
                        imports
                    )
        return (
            json_script(result).replace('type="application/json"', 'type="importmap"')
            + "\n"
        )

    def _add_media(self, other, *, reverse):
        combined = self.__class__()

        if type(other) is forms.Media:
            combined._asset_lists = []
            if not reverse:
                combined._asset_lists.extend(self._asset_lists)

            for medium_css_list in other._css_lists:
                for _medium, css_list in sorted(medium_css_list.items()):
                    combined._asset_lists.append(
                        [
                            # FIXME include media
                            CSS(css) if isinstance(css, str) else css
                            for css in css_list
                        ]
                    )

            for js_list in other._js_lists:
                combined._asset_lists.append(
                    [JS(js) if isinstance(js, str) else js for js in js_list]
                )

            if reverse:
                combined._asset_lists.extend(self._asset_lists)

            return combined

        if type(other) is ExtendedMedia:
            combined = self.__class__()

            if reverse:
                combined._asset_lists = [*other._asset_lists, *self._asset_lists]
            else:
                combined._asset_lists = [*self._asset_lists, *other._asset_lists]

            return combined

        return NotImplemented

    def __add__(self, other):
        return self._add_media(other, reverse=False)

    def __radd__(self, other):
        return self._add_media(other, reverse=True)


class ProseEditorWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        self.preset = kwargs.pop("preset", "default")
        super().__init__(*args, **kwargs)

    @property
    def base_media(self):
        return ExtendedMedia(
            [
                ImportMap(
                    {
                        "imports": {
                            "django-prose-editor/editor": static(
                                "django_prose_editor/editor.js"
                            )
                        }
                    }
                ),
            ]
        ) + forms.Media(
            css={
                "all": [
                    "django_prose_editor/material-icons.css",
                    "django_prose_editor/editor.css",
                ]
            },
            js=[
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
