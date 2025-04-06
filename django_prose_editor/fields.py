import re

from django import forms
from django.contrib.admin import widgets
from django.db import models
from django.utils.html import strip_tags
from django.utils.text import Truncator

from django_prose_editor.widgets import AdminProseEditorWidget, ProseEditorWidget


# This needs to be at the top level for backwards compatibility
__all__ = [
    "ProseEditorField",
    "ProseEditorFormField",
]


def _actually_empty(x):
    """
    ProseMirror's schema always adds at least one empty paragraph

    We want empty fields to actually be empty strings so that those field
    values evaluate as ``False`` in a boolean context.
    """
    if re.match(r"^<(?P<tag>\w+)></(?P=tag)>$", x):
        return ""
    return x


class ProseEditorField(models.TextField):
    def __init__(self, *args, **kwargs):
        self.sanitize = kwargs.pop("sanitize", _actually_empty)
        self.config = kwargs.pop("config", {})
        self.preset = kwargs.pop("preset", "default")
        # All configuration is handled through config and preset
        super().__init__(*args, **kwargs)

    def clean(self, value, instance):
        return self.sanitize(super().clean(value, instance))

    def formfield(self, **kwargs):
        defaults = {
            "form_class": ProseEditorFormField,
            "config": self.config,
            "preset": self.preset,
        }
        defaults.update(kwargs)
        return super().formfield(**defaults)

    def contribute_to_class(self, cls, name, **kwargs):
        """Add a ``get_*_excerpt`` method to models which returns a
        de-HTML-ified excerpt of the contents of this field"""
        super().contribute_to_class(cls, name, **kwargs)
        setattr(
            cls,
            f"get_{name}_excerpt",
            lambda self, words=10, truncate=" ...": Truncator(
                strip_tags(getattr(self, name))
            ).words(words, truncate=truncate),
        )

    def deconstruct(self):
        name, _path, args, kwargs = super().deconstruct()
        return (name, "django.db.models.TextField", args, kwargs)


def _is(widget, widget_class):
    return (
        issubclass(widget, widget_class)
        if isinstance(widget, type)
        else isinstance(widget, widget_class)
    )


class ProseEditorFormField(forms.CharField):
    widget = ProseEditorWidget

    def __init__(self, *args, **kwargs):
        config = kwargs.pop("config", {})
        preset = kwargs.pop("preset", "default")
        # All configuration is handled through config and preset
        widget = kwargs.get("widget")

        # We don't know if widget is set, and if it is, we do not know if it is
        # a class or an instance of the widget. The following if statement
        # should take all possibilities into account.
        if widget and _is(widget, widgets.AdminTextareaWidget):
            kwargs["widget"] = AdminProseEditorWidget(config=config, preset=preset)
        elif not widget or not _is(widget, ProseEditorWidget):
            kwargs["widget"] = ProseEditorWidget(config=config, preset=preset)
        elif isinstance(widget, ProseEditorWidget):
            # If it's already an instance, update its attributes
            widget.config = config
            widget.preset = preset
            # All attributes updated

        super().__init__(*args, **kwargs)
