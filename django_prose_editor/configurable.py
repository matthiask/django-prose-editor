"""
Configurable Prose Editor field with synchronized sanitization.

This module provides a field that uses the configuration system to automatically
generate front-end editor features and back-end sanitization rules.
"""

import json

from django_prose_editor.config import (
    expand_features,
    features_to_tiptap_extensions,
    generate_nh3_allowlist,
)
from django_prose_editor.fields import ProseEditorField, ProseEditorFormField
from django_prose_editor.widgets import ProseEditorWidget


class ConfigurableProseEditorWidget(ProseEditorWidget):
    """Widget for the ConfigurableProseEditorField."""

    def __init__(self, *args, **kwargs):
        self.features = kwargs.pop("features", {})
        preset = kwargs.pop("preset", None)
        if preset and not self.features:
            # If only preset is specified, use it directly
            self.features = {"preset": preset}
        elif preset:
            # If both are specified, add preset to features
            self.features["preset"] = preset

        # Use the configurable JavaScript implementation by default
        if "js_implementation" not in kwargs:
            kwargs["js_implementation"] = "configurable"

        # Calculate the effective types list for Tiptap
        expanded_features = expand_features(self.features)
        types = features_to_tiptap_extensions(expanded_features)

        # Convert features to the config format expected by ProseEditorWidget
        config = {
            "types": types,
            "history": expanded_features.get("history", True),
            "html": expanded_features.get("html", True),
            "typographic": expanded_features.get("typographic", True),
        }

        # Handle heading levels if specified
        if "heading" in expanded_features and isinstance(
            expanded_features["heading"], dict
        ):
            config["headingLevels"] = expanded_features["heading"].get(
                "levels", [1, 2, 3, 4, 5, 6]
            )

        # Add feature-specific configurations to allow the JS side to access them
        for feature, feature_config in expanded_features.items():
            if isinstance(feature_config, dict) and feature != "preset":
                # Add this feature's configuration to the global config
                # with the feature name as a prefix
                for key, value in feature_config.items():
                    config[f"{feature}.{key}"] = value

        # For backward compatibility with the default.js implementation,
        # we still need to pass the legacy config
        kwargs["config"] = config

        # Store the raw features for the configurable.js implementation
        self.raw_features = self.features

        # Check for custom extensions
        from django_prose_editor.config import get_custom_extensions

        get_custom_extensions()

        # Check if the field uses custom extensions
        # Note: We leave it to the user to specify the correct js_implementation
        # when using custom extensions

        super().__init__(*args, **kwargs)

    def get_context(self, name, value, attrs):
        """
        Override to add the raw features for configurable.js implementation.
        """
        context = super().get_context(name, value, attrs)

        # If using the configurable implementation, also pass the raw features
        if self.js_implementation == "configurable":
            context["widget"]["attrs"]["data-django-prose-editor-configurable"] = (
                json.dumps(
                    self.raw_features,
                    separators=(",", ":"),
                )
            )

        return context


class ConfigurableProseEditorFormField(ProseEditorFormField):
    """Form field for ConfigurableProseEditorField."""

    widget = ConfigurableProseEditorWidget

    def __init__(self, *args, **kwargs):
        self.features = kwargs.pop("features", {})
        self.preset = kwargs.pop("preset", None)  # Feature preset
        self.js_implementation = kwargs.pop(
            "js_implementation", None
        )  # JS implementation

        # Pass features to the widget
        kwargs["widget"] = self.widget(
            features=self.features,
            preset=self.preset,  # Use "preset" for feature preset
            js_implementation=self.js_implementation,  # Use "js_implementation" for JS implementation
        )

        super().__init__(*args, **kwargs)


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

            return _actually_empty(
                nh3.clean(html, attributes=allowlist, url_filter=url_filter)
            )

        return sanitize_html

    def formfield(self, **kwargs):
        """Return a ConfigurableProseEditorFormField for this field."""
        defaults = {
            "form_class": ConfigurableProseEditorFormField,
            "features": self.features,
            "preset": self.preset,
            "js_implementation": self.js_implementation,
        }
        defaults.update(kwargs)
        return super(ProseEditorField, self).formfield(**defaults)
