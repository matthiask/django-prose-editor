"""
Configurable Prose Editor field with synchronized sanitization.

This module provides a field that uses the configuration system to automatically
generate front-end editor features and back-end sanitization rules.
"""

from django_prose_editor.config import (
    expand_features,
    generate_nh3_allowlist,
)
from django_prose_editor.fields import ProseEditorField


class ConfigurableProseEditorField(ProseEditorField):
    """
    A field that uses a unified configuration for both editor features and sanitization.

    This field automatically synchronizes the editor capabilities with server-side
    sanitization rules, ensuring that what users can create in the editor matches
    what is allowed after sanitization.

    Args:
        features: Dictionary mapping feature names to their configuration
        preset: Optional feature preset name to use as a base configuration
        js_implementation: Optional JavaScript implementation name to override the default
        sanitize: Whether to enable sanitization (True/False) or a custom sanitizer function
    """

    def __init__(self, *args, **kwargs):
        self.features = kwargs.pop("features", {})
        self.preset = kwargs.pop("preset", None)
        self.js_implementation = kwargs.pop("js_implementation", None)

        if self.preset and not self.features:
            # If only preset is specified, use it directly
            self.features = {"preset": self.preset}
        elif self.preset:
            # If both are specified, add preset to features
            self.features["preset"] = self.preset

        # Handle sanitization
        sanitize = kwargs.get("sanitize")
        if sanitize is True:
            # If sanitize=True, use our automatic sanitizer based on features
            kwargs["sanitize"] = self._create_sanitizer()

        # Remove 'config' if it exists to avoid conflicts with our features approach
        kwargs.pop("config", None)

        super().__init__(*args, **kwargs)

    def _create_sanitizer(self):
        """Create a sanitizer function based on feature configuration."""
        try:
            import nh3
        except ImportError:
            raise ImportError(
                "You need to install nh3 to use automatic sanitization. "
                "Install django-prose-editor[sanitize] or pip install nh3"
            )

        # Generate allowlist based on features
        allowlist = generate_nh3_allowlist(self.features)

        # Check for protocol restrictions on links
        url_filter = None
        if "link" in self.features and isinstance(self.features["link"], dict):
            if "protocols" in self.features["link"]:
                from django_prose_editor.sanitized import _create_protocol_validator

                url_filter = _create_protocol_validator(
                    self.features["link"]["protocols"]
                )

        # Create and return the sanitizer function
        def sanitize_html(html):
            from django_prose_editor.fields import _actually_empty

            # Use url_schemes for protocol validation
            kwargs = {
                # TODO tags?
                "attributes": allowlist,
            }

            # If we have protocols specified
            if url_filter is not None:
                # Use url_schemes for validating URLs (simpler approach)
                protocols = self.features["link"].get("protocols", [])
                kwargs["url_schemes"] = set(protocols)
                # When using url_schemes, link_rel must be set to None if we want to preserve rel
                kwargs["link_rel"] = None

            return _actually_empty(nh3.clean(html, **kwargs))

        return sanitize_html

    def formfield(self, **kwargs):
        """Return a ConfigurableProseEditorFormField for this field."""
        defaults = {
            "config": expand_features(self.features),  # XXX update name?
            "preset": self.js_implementation,  # XXX update the name later.
        } | kwargs
        return super().formfield(**defaults)
