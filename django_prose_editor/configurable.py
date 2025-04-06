"""
Configurable Prose Editor field with synchronized sanitization.

This module provides a field that uses the configuration system to automatically
generate front-end editor features and back-end sanitization rules.
"""

from django_prose_editor.config import (
    expand_features,
    features_to_allowlist,
)
from django_prose_editor.fields import ProseEditorField, _actually_empty


class ConfigurableProseEditorField(ProseEditorField):
    """
    A field that uses a unified configuration for both editor features and sanitization.

    This field automatically synchronizes the editor capabilities with server-side
    sanitization rules, ensuring that what users can create in the editor matches
    what is allowed after sanitization.

    Sanitization is enabled by default and automatically configured based on the
    features you enable, so you don't need to specify HTML allowlists separately.

    Args:
        features: Dictionary mapping feature names to their configuration
        preset: Optional JavaScript preset name to override the default
        sanitize: Whether to enable sanitization (defaults to True) or a custom sanitizer function
    """

    def __init__(self, *args, **kwargs):
        self.features = kwargs.pop("features", {})

        # Get the preset for JavaScript implementation
        self.preset = kwargs.pop("preset", "configurable")

        # Expand features to include all dependencies
        expanded_features = expand_features(self.features)

        # Get the full allowlist including JavaScript modules
        feature_allowlist = features_to_allowlist(self.features)

        # Handle sanitization - default to True for this field
        sanitize = kwargs.pop("sanitize", True)
        if sanitize is True:
            # If sanitize=True, use our automatic sanitizer based on features
            kwargs["sanitize"] = self._create_sanitizer(feature_allowlist)
        else:
            # Pass through the sanitize value (False or custom function)
            kwargs["sanitize"] = sanitize

        # Add JavaScript modules to the expanded features
        if feature_allowlist.get("js_modules"):
            expanded_features["_js_modules"] = feature_allowlist["js_modules"]

        # Use config parameter for the expanded features
        kwargs["config"] = expanded_features

        # Set the preset
        kwargs["preset"] = self.preset

        super().__init__(*args, **kwargs)

    def _create_sanitizer(self, sanitize_config=None):
        """Create a sanitizer function based on feature configuration."""
        try:
            import nh3  # noqa: F401
        except ImportError:
            raise ImportError(
                "You need to install nh3 to use automatic sanitization. "
                "Install django-prose-editor[sanitize] or pip install nh3"
            )

        # Get the full sanitization config if not provided
        if sanitize_config is None:
            sanitize_config = features_to_allowlist(self.features)

        # Create a copy of the config excluding js_modules which isn't for nh3
        nh3_kwargs = {k: v for k, v in sanitize_config.items() if k != "js_modules"}

        # Create and return the sanitizer function
        def sanitize_html(html):
            import nh3

            return _actually_empty(nh3.clean(html, **nh3_kwargs))

        return sanitize_html
