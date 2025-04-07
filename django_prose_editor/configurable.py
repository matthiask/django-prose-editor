"""
Configurable Prose Editor field with synchronized sanitization.

This module provides a field that uses the configuration system to automatically
generate front-end editor extensions and back-end sanitization rules.
"""

from django_prose_editor.config import (
    expand_extensions,
    extensions_to_allowlist,
)
from django_prose_editor.fields import ProseEditorField, _actually_empty


class ConfigurableProseEditorField(ProseEditorField):
    """
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
        extensions = kwargs.pop(
            "extensions",
            {
                "Blockquote": True,
                "Bold": True,
                "BulletList": True,
                "Heading": True,
                "HorizontalRule": True,
                "Italic": True,
                "Link": True,
                "OrderedList": True,
                "Strike": True,
                "Subscript": True,
                "Superscript": True,
                "Underline": True,
            },
        )

        extensions = expand_extensions(extensions)
        extension_allowlist = extensions_to_allowlist(extensions)
        js_modules = extension_allowlist.pop("js_modules", set())

        # Handle sanitization - default to True for this field
        sanitize = kwargs.pop("sanitize", True)
        if sanitize is True:
            # If sanitize=True, use our automatic sanitizer based on extensions
            kwargs["sanitize"] = self._create_sanitizer(extension_allowlist)
        else:
            # Pass through the sanitize value (False or custom function)
            kwargs["sanitize"] = sanitize

        kwargs["config"] = extensions | {"_js_modules": list(js_modules)}
        kwargs.setdefault("preset", "configurable")
        super().__init__(*args, **kwargs)

    def _create_sanitizer(self, nh3_kwargs):
        """Create a sanitizer function based on extension configuration."""
        try:
            import nh3
        except ImportError:
            raise ImportError(
                "You need to install nh3 to use automatic sanitization. "
                "Install django-prose-editor[sanitize] or pip install nh3"
            )
        else:
            return lambda html: _actually_empty(nh3.clean(html, **nh3_kwargs))
