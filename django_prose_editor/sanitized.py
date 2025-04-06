"""
Sanitized Prose Editor fields with automatic HTML cleanup.

This module provides field classes that automatically sanitize HTML content
based on editor configurations.
"""

from copy import deepcopy
from typing import Any

from django_prose_editor.config import generate_nh3_allowlist
from django_prose_editor.configurable import ConfigurableProseEditorField
from django_prose_editor.fields import _actually_empty


def _create_protocol_validator(protocols):
    """
    Create a validator function for link protocols.

    Args:
        protocols: List of allowed protocols (e.g., ['http', 'https', 'mailto'])

    Returns:
        A validator function for nh3's attribute_filter parameter
    """
    allowed_protocols = set(protocols)

    def validate_attribute(tag, attr, value):
        """
        Validate attributes, specifically checking href URLs for protocols.

        This function matches the signature needed for nh3's attribute_filter parameter.
        """
        # We only want to validate href attributes
        if tag != "a" or attr != "href":
            return value

        if not value:
            return None

        # Allow relative URLs or in-page links
        if value.startswith(("/", "#")):
            return value

        # Check protocol
        if any(value.startswith(f"{protocol}:") for protocol in allowed_protocols):
            return value

        # If protocol is not allowed, remove the attribute
        return None

    return validate_attribute


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


def generate_allowlist(
    features: dict[str, Any] = None,
) -> dict[str, set[str] | dict[str, set[str]]]:
    """
    Generate an nh3-compatible allowlist from feature configuration.

    This function provides a user-facing API for generating allowlists that can
    be used with nh3.clean() directly.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Dictionary with allowed tags and attributes
    """
    if features is None:
        # Default features for backward compatibility
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
        }

    return generate_nh3_allowlist(features)


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
