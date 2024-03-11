from django import forms
from django.db import models
from django.utils.html import strip_tags
from django.utils.text import Truncator

from django_prose_editor.widgets import ProseEditorWidget


def _identity(x):
    return x


class ProseEditorField(models.TextField):
    def __init__(self, *args, **kwargs):
        self.sanitize = kwargs.pop("sanitize", _identity)
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
        defaults = {"form_class": ProseEditorFormField} | kwargs
        return super().formfield(**defaults)


class ProseEditorFormField(forms.CharField):
    widget = ProseEditorWidget

    def __init__(self, *args, **kwargs):
        kwargs["widget"] = ProseEditorWidget
        super().__init__(*args, **kwargs)
