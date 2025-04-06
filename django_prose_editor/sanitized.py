"""
Sanitized Prose Editor fields with automatic HTML cleanup.

This module provides field classes that automatically sanitize HTML content
based on editor configurations.
"""

from copy import deepcopy

from django_prose_editor.configurable import ConfigurableProseEditorField
from django_prose_editor.fields import _actually_empty


def _nh3_sanitizer():
    """
    Legacy sanitizer function that adds specific attributes to nh3's allowlist.

    This is kept for backward compatibility with existing SanitizedProseEditorField usage.
    New code should use ConfigurableSanitizedProseEditorField instead.
    """

    import nh3

    attributes = deepcopy(nh3.ALLOWED_ATTRIBUTES)
    attributes["a"].add("target")
    attributes["ol"] |= {"start", "type"}

    return lambda x: _actually_empty(nh3.clean(x, attributes=attributes))


class SanitizedProseEditorField(ConfigurableProseEditorField):
    """
    Legacy field that automatically sanitizes HTML using nh3.

    Deprecated: Use ConfigurableProseEditorField with sanitize=True instead.

    Args:
        config: Legacy configuration dictionary
        features: Dictionary mapping feature names to their configuration
        preset: Optional preset name to use as a base configuration
        sanitize: Whether to enable sanitization (defaults to True)
    """

    def __init__(self, *args, **kwargs):
        import warnings

        warnings.warn(
            "SanitizedProseEditorField is deprecated. Use ConfigurableProseEditorField with sanitize=True instead.",
            DeprecationWarning,
            stacklevel=2,
        )

        # Convert config to features if present
        config = kwargs.pop("config", {})
        features = kwargs.pop("features", {})

        if config and "types" in config:
            for feature_type in config["types"]:
                features[feature_type] = True

            for key in ["history", "html", "typographic"]:
                if key in config:
                    features[key] = config[key]

        # If no explicit features, use the defaults that match legacy behavior
        if not features:
            features = {
                "bold": True,
                "italic": True,
                "strike": True,
                "underline": True,
                "subscript": True,
                "superscript": True,
                "heading": True,
                "paragraph": True,
                "bulletList": True,
                "orderedList": True,
                "blockquote": True,
                "horizontalRule": True,
                "link": {"allowTargetBlank": True},
                "history": True,
                "html": True,
                "typographic": True,
            }

        # Use the legacy sanitizer directly for backward compatibility
        # This bypasses any issues with the configurable field sanitizer
        kwargs["sanitize"] = _nh3_sanitizer()

        # Call parent with transformed parameters
        super().__init__(*args, features=features, **kwargs)
