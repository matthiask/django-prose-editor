import re

from django import forms
from django.db import models
from django.utils.html import strip_tags
from django.utils.text import Truncator

from django_prose_editor.widgets import ProseEditorWidget


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
        super().__init__(*args, **kwargs)

    def clean(self, value, instance):
        return self.sanitize(super().clean(value, instance))

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

    def formfield(self, **kwargs):
        defaults = {"config": self.config, "form_class": ProseEditorFormField} | kwargs
        return super().formfield(**defaults)


class ProseEditorFormField(forms.CharField):
    widget = ProseEditorWidget

    def __init__(self, *args, **kwargs):
        config = kwargs.pop("config", {})
        kwargs["widget"] = ProseEditorWidget
        super().__init__(*args, **kwargs)
        self.widget.config = config
