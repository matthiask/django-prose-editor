import re

from django import forms
from django.contrib.admin import widgets
from django.db import models
from django.utils.html import strip_tags
from django.utils.text import Truncator

from django_prose_editor.config import (
    allowlist_from_extensions,
    expand_extensions,
)
from django_prose_editor.widgets import AdminProseEditorWidget, ProseEditorWidget


def _actually_empty(x):
    """
    ProseMirror's schema always adds at least one empty paragraph

    We want empty fields to actually be empty strings so that those field
    values evaluate as ``False`` in a boolean context.
    """
    if re.match(r"^<(?P<tag>\w+)></(?P=tag)>$", x):
        return ""
    return x


def _identity(x):
    return x


def create_sanitizer(extensions):
    """Create a sanitizer function based on extension configuration."""
    try:
        import nh3  # noqa: PLC0415
    except ImportError:
        raise ImportError(
            "You need to install nh3 to use automatic sanitization. "
            "Install django-prose-editor[sanitize] or pip install nh3"
        )

    nh3_kwargs = allowlist_from_extensions(expand_extensions(extensions))
    cleaner = nh3.Cleaner(**nh3_kwargs)
    return lambda html: _actually_empty(cleaner.clean(html))


def _create_sanitizer(argument, config):
    if argument is False:
        return _actually_empty

    if argument is True:
        return create_sanitizer(config["extensions"])

    if isinstance(argument, (list, tuple)):
        argument = [
            fn(config["extensions"]) if fn == create_sanitizer else fn
            for fn in argument
        ]

        def apply(html):
            for fn in reversed(argument):
                html = fn(html)
            return html

        return apply

    return argument


class ProseEditorField(models.TextField):
    """
    The field has two modes: Legacy mode and normal mode. Normal mode is
    activated by passing an ``config`` dict containing an ``extensions`` key.
    This mode is described below. See the README for the legacy mode.

    A field that uses a unified configuration for both editor extensions and sanitization.

    This field automatically synchronizes the editor capabilities with server-side
    sanitization rules, ensuring that what users can create in the editor matches
    what is allowed after sanitization.

    Args:
        config: Dictionary mapping extension names to their configuration
        preset: Optional JavaScript preset name to override the default
        sanitize: Whether to enable sanitization or a custom sanitizer function
    """

    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        if extensions := kwargs.pop("extensions", None):
            self.config["extensions"] = extensions

        if "extensions" in self.config:
            # Normal mode
            self.sanitize = _create_sanitizer(
                kwargs.pop("sanitize", False), self.config
            )
            self.preset = kwargs.pop("preset", "configurable")

        else:
            # Legacy mode
            self.sanitize = _create_sanitizer(kwargs.pop("sanitize", False), None)
            self.preset = kwargs.pop("preset", "default")

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
        defaults = {
            "config": self.config,
            "form_class": ProseEditorFormField,
            "preset": self.preset,
        } | kwargs
        return super().formfield(**defaults)


def _is(widget, widget_class):
    return (
        issubclass(widget, widget_class)
        if isinstance(widget, type)
        else isinstance(widget, widget_class)
    )


class ProseEditorFormField(forms.CharField):
    widget = ProseEditorWidget

    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        if extensions := kwargs.pop("extensions", None):
            self.config["extensions"] = extensions

        if "extensions" in self.config:
            # Normal mode
            self.sanitize = _create_sanitizer(
                kwargs.pop("sanitize", _identity), self.config
            )
            self.preset = kwargs.pop("preset", "configurable")

        else:
            # Legacy mode
            self.sanitize = kwargs.pop("sanitize", _identity)
            self.preset = kwargs.pop("preset", "default")

        widget = kwargs.get("widget")

        # We don't know if widget is set, and if it is, we do not know if it is
        # a class or an instance of the widget. The following if statement
        # should take all possibilities into account.
        if widget and _is(widget, widgets.AdminTextareaWidget):
            kwargs["widget"] = AdminProseEditorWidget
        elif not widget or not _is(widget, ProseEditorWidget):
            kwargs["widget"] = ProseEditorWidget

        super().__init__(*args, **kwargs)
        self.widget.config = self.config
        self.widget.preset = self.preset

    def clean(self, value):
        return self.sanitize(super().clean(value))
