"""
Configuration system for Django Prose Editor.

This module provides a way to define editor features and generate
corresponding sanitization rules for server-side HTML cleaning.
"""

from copy import deepcopy
from typing import Any


# Function to load custom extensions from settings
def get_custom_extensions():
    """
    Load custom extensions from Django settings.

    Returns:
        Dictionary mapping extension names to their configurations
    """
    from django.conf import settings

    return getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", {})


# Default feature-to-HTML mapping
# This defines what HTML elements and attributes each feature allows
FEATURE_MAPPING = {
    # Core formatting
    "bold": {
        "tags": ["strong"],
        "attributes": {},
    },
    "italic": {
        "tags": ["em"],
        "attributes": {},
    },
    "strike": {
        "tags": ["s"],
        "attributes": {},
    },
    "underline": {
        "tags": ["u"],
        "attributes": {},
    },
    "subscript": {
        "tags": ["sub"],
        "attributes": {},
    },
    "superscript": {
        "tags": ["sup"],
        "attributes": {},
    },
    # Structure
    "heading": {
        "tags": ["h1", "h2", "h3", "h4", "h5", "h6"],
        "attributes": {},
    },
    "paragraph": {
        "tags": ["p"],
        "attributes": {},
    },
    "hardBreak": {
        "tags": ["br"],
        "attributes": {},
    },
    "bulletList": {
        "tags": ["ul"],
        "attributes": {},
    },
    "orderedList": {
        "tags": ["ol"],
        "attributes": {
            "ol": ["start", "type"],
        },
    },
    "listItem": {
        "tags": ["li"],
        "attributes": {},
    },
    "blockquote": {
        "tags": ["blockquote"],
        "attributes": {},
    },
    "horizontalRule": {
        "tags": ["hr"],
        "attributes": {},
    },
    # Advanced features
    "link": {
        "tags": ["a"],
        "attributes": {
            "a": ["href", "target", "rel"],
        },
    },
    "table": {
        "tags": ["table", "tbody", "thead", "tr", "th", "td"],
        "attributes": {
            "th": ["rowspan", "colspan"],
            "td": ["rowspan", "colspan"],
        },
    },
}

# Automatic dependencies (features that require other features)
FEATURE_DEPENDENCIES = {
    "bulletList": ["listItem"],
    "orderedList": ["listItem"],
    "table": ["tableRow", "tableHeader", "tableCell"],
}

# Predefined feature sets
FEATURE_PRESETS = {
    "minimal": {
        "bold": True,
        "italic": True,
        "strike": True,
        "paragraph": True,
        "hardBreak": True,
        "history": True,
    },
    "basic": {
        "bold": True,
        "italic": True,
        "strike": True,
        "underline": True,
        "paragraph": True,
        "bulletList": True,
        "orderedList": True,
        "hardBreak": True,
        "link": True,
        "history": True,
        "html": True,
    },
    "standard": {
        "bold": True,
        "italic": True,
        "strike": True,
        "underline": True,
        "subscript": True,
        "superscript": True,
        "paragraph": True,
        "heading": {"levels": [1, 2, 3, 4, 5, 6]},
        "bulletList": True,
        "orderedList": True,
        "blockquote": True,
        "horizontalRule": True,
        "hardBreak": True,
        "link": {"allowTargetBlank": True},
        "history": True,
        "html": True,
        "typographic": True,
    },
    "full": {
        "bold": True,
        "italic": True,
        "strike": True,
        "underline": True,
        "subscript": True,
        "superscript": True,
        "paragraph": True,
        "heading": {"levels": [1, 2, 3, 4, 5, 6]},
        "bulletList": True,
        "orderedList": True,
        "blockquote": True,
        "horizontalRule": True,
        "hardBreak": True,
        "link": {"allowTargetBlank": True},
        "table": True,
        "history": True,
        "html": True,
        "typographic": True,
    },
}

# Core features that are always enabled
CORE_FEATURES = ["document", "paragraph", "text"]


def expand_features(features: dict[str, Any]) -> dict[str, Any]:
    """
    Expand feature configuration by applying defaults and resolving dependencies.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Expanded feature configuration
    """
    expanded = {}

    # Start with a preset if specified
    preset_name = features.get("preset")
    if preset_name and preset_name in FEATURE_PRESETS:
        expanded.update(FEATURE_PRESETS[preset_name])

    # Override with user-specified features
    expanded.update(features)

    # Always include core features
    for feature in CORE_FEATURES:
        if feature not in expanded:
            expanded[feature] = True

    # Resolve dependencies
    for feature, deps in FEATURE_DEPENDENCIES.items():
        if feature in expanded and expanded[feature]:
            for dep in deps:
                if dep not in expanded:
                    expanded[dep] = True

    return expanded


def features_to_tiptap_extensions(features: dict[str, Any]) -> list[str]:
    """
    Convert feature configuration to list of enabled Tiptap extensions.

    Args:
        features: Dictionary of feature configurations

    Returns:
        List of extension names to enable
    """
    extensions = []

    # Get custom extensions
    get_custom_extensions()

    for feature, config in features.items():
        if not config:  # Skip disabled features
            continue

        # Skip special config keys
        if feature == "preset":
            continue

        # Add the feature to the list of extensions
        extensions.append(feature)

        # Custom extensions are handled by the JavaScript preset

    return extensions


def features_to_allowlist(
    features: dict[str, Any],
) -> dict[str, list[str] | dict[str, list[str]]]:
    """
    Generate HTML sanitization allowlist from feature configuration.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Dictionary with 'tags' and 'attributes' keys
    """
    expanded = expand_features(features)

    allowed_tags: set[str] = set()
    allowed_attributes: dict[str, set[str]] = {}

    # Get custom extensions
    custom_extensions = get_custom_extensions()

    # Process each enabled feature
    for feature, config in expanded.items():
        if not config:
            continue

        # Skip non-HTML features
        if feature in ("history", "html", "typographic"):
            continue

        # Check if it's a built-in feature
        mapping = FEATURE_MAPPING.get(feature)

        # If not built-in, check if it's a custom extension
        if not mapping and feature in custom_extensions:
            mapping = {
                "tags": custom_extensions[feature].get("tags", []),
                "attributes": custom_extensions[feature].get("attributes", {}),
            }

        # Skip if we don't have a mapping
        if not mapping:
            continue

        # Add tags
        allowed_tags.update(mapping.get("tags", []))

        # Add attributes
        for tag, attrs in mapping.get("attributes", {}).items():
            if tag not in allowed_attributes:
                allowed_attributes[tag] = set()
            allowed_attributes[tag].update(attrs)

        # Handle feature-specific configurations
        if feature == "heading" and isinstance(config, dict) and "levels" in config:
            levels = config["levels"]
            # Filter heading tags based on allowed levels
            heading_tags = {f"h{level}" for level in levels if 1 <= level <= 6}
            # Replace all h1-h6 tags with just the allowed ones
            allowed_tags = {
                tag for tag in allowed_tags if not tag.startswith("h")
            } | heading_tags

        if feature == "link" and isinstance(config, dict):
            if config.get("allowTargetBlank", True) is False:
                if "a" in allowed_attributes and "target" in allowed_attributes["a"]:
                    allowed_attributes["a"].remove("target")

            # Handle protocol restrictions
            if "protocols" in config:
                # Note: This doesn't modify the allowlist, but would be used in sanitization
                pass

    # Convert sets to lists for the final output
    return {
        "tags": sorted(allowed_tags),
        "attributes": {tag: sorted(attrs) for tag, attrs in allowed_attributes.items()},
    }


def generate_nh3_allowlist(features: dict[str, Any]) -> dict[str, dict[str, set[str]]]:
    """
    Generate an nh3-compatible allowlist from feature configuration.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Dictionary compatible with nh3.clean's attributes parameter
    """
    import nh3

    # Start with nh3's default allowed attributes
    allowlist = deepcopy(nh3.ALLOWED_ATTRIBUTES)

    # Get our feature-based allowlist
    feature_allowlist = features_to_allowlist(features)

    # Update the nh3 allowlist with our feature-based attributes
    for tag, attrs in feature_allowlist["attributes"].items():
        if tag not in allowlist:
            allowlist[tag] = set()
        allowlist[tag].update(attrs)

    return allowlist
