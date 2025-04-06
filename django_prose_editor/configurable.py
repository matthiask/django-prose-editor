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
        self.extensions = kwargs.pop("extensions", {})

        # Get the preset for JavaScript implementation
        self.preset = kwargs.pop("preset", "configurable")

        # Expand extensions to include all dependencies
        expanded_extensions = expand_extensions(self.extensions)

        # Get the full allowlist including JavaScript modules
        extension_allowlist = extensions_to_allowlist(expanded_extensions)
        js_modules = extension_allowlist.pop("js_modules", set())

        # Handle sanitization - default to True for this field
        sanitize = kwargs.pop("sanitize", True)
        if sanitize is True:
            # If sanitize=True, use our automatic sanitizer based on extensions
            kwargs["sanitize"] = self._create_sanitizer(extension_allowlist)
        else:
            # Pass through the sanitize value (False or custom function)
            kwargs["sanitize"] = sanitize

        # Add JavaScript modules to the expanded extensions
        if js_modules:
            expanded_extensions["_js_modules"] = list(js_modules)

        # Use config parameter for the expanded extensions
        kwargs["config"] = expanded_extensions

        # Set the preset
        kwargs["preset"] = self.preset

        super().__init__(*args, **kwargs)

    def _create_sanitizer(self, nh3_kwargs):
        """Create a sanitizer function based on extension configuration."""
        try:
            import nh3  # noqa: F401
        except ImportError:
            raise ImportError(
                "You need to install nh3 to use automatic sanitization. "
                "Install django-prose-editor[sanitize] or pip install nh3"
            )

        # Create and return the sanitizer function
        def sanitize_html(html):
            import nh3

            return _actually_empty(nh3.clean(html, **nh3_kwargs))

        return sanitize_html
