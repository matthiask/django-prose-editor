import re
import warnings

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
        import nh3
    except ImportError:
        raise ImportError(
            "You need to install nh3 to use automatic sanitization. "
            "Install django-prose-editor[sanitize] or pip install nh3"
        )

    nh3_kwargs = allowlist_from_extensions(expand_extensions(extensions))
    return lambda html: _actually_empty(nh3.clean(html, **nh3_kwargs))


def _configure(object, kwargs):
    extensions = kwargs.pop("extensions")
    sanitize = kwargs.pop("sanitize", True)
    if sanitize is True:
        object.sanitize = create_sanitizer(extensions)
    else:
        object.sanitize = sanitize or _actually_empty

    # Expand extensions to include dependencies
    expanded_extensions = expand_extensions(extensions)

    # Place extended extensions inside an "extensions" key to clearly
    # differentiate from old-style config
    object.config = {"extensions": expanded_extensions}
    object.preset = kwargs.pop("preset", "configurable")


class ProseEditorField(models.TextField):
    """
    The field has two modes: Legacy mode and normal mode. Normal mode is
    activated by passing an ``extensions`` keyword argument. This mode is
    described below. See the README for the legacy mode.

    A field that uses a unified configuration for both editor extensions and sanitization.

    This field automatically synchronizes the editor capabilities with server-side
    sanitization rules, ensuring that what users can create in the editor matches
    what is allowed after sanitization.

    Sanitization is enabled by default and automatically configured based on the
    extensions you enable, so you don't need to specify HTML allowlists separately.

    Args:
        extensions: Dictionary mapping extension names to their configuration
        preset: Optional JavaScript preset name to override the default
        sanitize: Whether to enable sanitization (defaults to True) or a custom sanitizer function
    """

    def __init__(self, *args, **kwargs):
        if kwargs.get("extensions"):
            # Normal mode
            _configure(self, kwargs)

        else:
            # Legacy mode
            warnings.warn(
                "Using the 'config' parameter with ProseEditorField is deprecated and will be "
                "removed in a future version. Please use the 'extensions' parameter instead, "
                "which provides more powerful configuration capabilities.",
                DeprecationWarning,
                stacklevel=2,
            )
            self.sanitize = kwargs.pop("sanitize", _actually_empty)
            self.config = kwargs.pop("config", {})
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
        if kwargs.get("extensions"):
            _configure(self, kwargs)

        else:
            self.sanitize = kwargs.pop("sanitize", _identity)
            self.config = kwargs.pop("config", {})
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
