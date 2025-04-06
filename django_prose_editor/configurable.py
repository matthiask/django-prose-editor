"""
Configurable Prose Editor field with synchronized sanitization.

This module provides a field that uses the configuration system to automatically
generate front-end editor features and back-end sanitization rules.
"""

from django_prose_editor.config import (
    expand_features,
    features_to_allowlist,
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
        group: Optional feature group name to use as a base configuration
        preset: Optional JavaScript preset name to override the default
        sanitize: Whether to enable sanitization (True/False) or a custom sanitizer function
    """

    def __init__(self, *args, **kwargs):
        self.features = kwargs.pop("features", {})
        self.group = kwargs.pop("group", None)

        # Allow backwards compatibility with "preset" for feature groups
        old_preset = kwargs.pop("preset", None)
        if old_preset and not self.group:
            self.group = old_preset

        # Get the preset (renamed from js_implementation)
        self.preset = kwargs.pop("preset", "configurable")

        # Convert group to feature configuration
        if self.group and not self.features:
            # If only group is specified, use it directly
            self.features = {"group": self.group}
        elif self.group:
            # If both are specified, add group to features
            self.features["group"] = self.group

        # Handle sanitization
        sanitize = kwargs.get("sanitize")
        if sanitize is True:
            # If sanitize=True, use our automatic sanitizer based on features
            kwargs["sanitize"] = self._create_sanitizer()

        # Expand features to include all dependencies
        expanded_features = expand_features(self.features)

        # Use config parameter for the expanded features
        kwargs["config"] = expanded_features

        # Set the preset
        kwargs["preset"] = self.preset

        super().__init__(*args, **kwargs)

    def _create_sanitizer(self):
        """Create a sanitizer function based on feature configuration."""
        try:
            import nh3  # noqa: F401
        except ImportError:
            raise ImportError(
                "You need to install nh3 to use automatic sanitization. "
                "Install django-prose-editor[sanitize] or pip install nh3"
            )

        # Get the full allowlist with tags and attributes
        feature_allowlist = features_to_allowlist(self.features)

        # Check for protocol restrictions on links
        protocols = None
        if "link" in self.features and isinstance(self.features["link"], dict):
            if "protocols" in self.features["link"]:
                protocols = self.features["link"]["protocols"]

        # Create and return the sanitizer function
        def sanitize_html(html):
            import nh3

            from django_prose_editor.fields import _actually_empty

            # Prepare arguments for nh3.clean
            kwargs = {
                "tags": set(feature_allowlist["tags"]),
                "attributes": {
                    tag: set(attrs)
                    for tag, attrs in feature_allowlist["attributes"].items()
                },
            }

            # If we have protocols specified
            if protocols is not None:
                # Use url_schemes for validating URLs
                kwargs["url_schemes"] = set(protocols)
                # When using url_schemes, link_rel must be set to None if we want to preserve rel
                kwargs["link_rel"] = None

            return _actually_empty(nh3.clean(html, **kwargs))

        return sanitize_html
