from django import forms
from django.db import models

from django_prose_editor.widgets import ProseEditorWidget


class ProseEditorField(models.TextField):
    def formfield(self, **kwargs):
        defaults = {"form_class": ProseEditorFormField} | kwargs
        return super().formfield(**defaults)

    def deconstruct(self):
        name, _path, args, kwargs = super().deconstruct()
        return (name, "django.db.models.TextField", args, kwargs)


class ProseEditorFormField(forms.CharField):
    widget = ProseEditorWidget

    def __init__(self, *args, **kwargs):
        kwargs["widget"] = ProseEditorWidget
        super().__init__(*args, **kwargs)
