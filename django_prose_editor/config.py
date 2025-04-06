"""
Configuration system for Django Prose Editor.

This module provides a way to define editor features and generate
corresponding sanitization rules for server-side HTML cleaning.
"""

import warnings
from typing import Any

from django.conf import settings
from django.utils.module_loading import import_string


# Function to load custom extensions from settings
def get_custom_extensions():
    """
    Load custom extensions from Django settings.

    Returns:
        Dictionary mapping extension names to their processor callables or dotted paths
    """

    return getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", {})


# Feature processors
# These functions update a shared sanitization config
def create_simple_processor(tags, attributes=None, *, js_module=None):
    """
    Create a simple processor function that adds tags and attributes to the sanitization config.

    Args:
        tags: List of HTML tags
        attributes: Dict mapping tags to allowed attributes
        js_module: Optional URL to JavaScript module implementing this extension

    Returns:
        A processor function that updates the shared config
    """

    def processor(feature_config, shared_config):
        # Add tags to the config
        shared_config["tags"].update(tags)

        # Add attributes to the config
        attrs = attributes or {}
        for tag, allowed_attrs in attrs.items():
            if tag not in shared_config["attributes"]:
                shared_config["attributes"][tag] = set()
            shared_config["attributes"][tag].update(allowed_attrs)

        # Add JavaScript module if provided
        if js_module:
            shared_config["js_modules"].add(js_module)

    return processor


def process_heading(config, shared_config):
    """Process heading feature configuration."""
    tags = ["h1", "h2", "h3", "h4", "h5", "h6"]

    # Filter tags based on levels if specified
    if isinstance(config, dict) and "levels" in config:
        levels = config["levels"]
        tags = [f"h{level}" for level in levels if 1 <= level <= 6]

    # Add tags to the shared config
    shared_config["tags"].update(tags)


def process_link(config, shared_config):
    """Process link feature configuration."""
    # Add the a tag to allowed tags
    shared_config["tags"].update(["a"])

    # Initialize attributes for the a tag if not present
    if "a" not in shared_config["attributes"]:
        shared_config["attributes"]["a"] = set()

    # Add standard attributes
    shared_config["attributes"]["a"].update(["href", "rel", "title"])

    # Include target attribute unless explicitly disabled
    target_allowed = True
    if isinstance(config, dict):
        if "allowTargetBlank" in config:
            target_allowed = bool(config["allowTargetBlank"])

        # Include URL schemes if specified (for nh3 sanitization)
        if "protocols" in config:
            if "url_schemes" not in shared_config:
                shared_config["url_schemes"] = set()
            shared_config["url_schemes"].update(config["protocols"])
            # When restricting URL schemes, we need to set link_rel to None
            # to preserve the rel attribute
            shared_config["link_rel"] = None

    if target_allowed:
        shared_config["attributes"]["a"].add("target")


# Additional processors for other extensions
def process_code_block(config, shared_config):
    """Process code block feature configuration."""
    # Add tags
    shared_config["tags"].update(["pre", "code"])

    # Include language attribute if supported
    if isinstance(config, dict) and config.get("languageClassPrefix"):
        # Add pre attributes
        if "pre" not in shared_config["attributes"]:
            shared_config["attributes"]["pre"] = set()
        shared_config["attributes"]["pre"].add("class")

        # Add code attributes
        if "code" not in shared_config["attributes"]:
            shared_config["attributes"]["code"] = set()
        shared_config["attributes"]["code"].add("class")


def process_figure(config, shared_config):
    """Process figure feature configuration."""
    # Add tags
    shared_config["tags"].update(["figure", "figcaption", "img"])

    # Add attributes for img
    if "img" not in shared_config["attributes"]:
        shared_config["attributes"]["img"] = set()
    shared_config["attributes"]["img"].update(["src", "alt", "width", "height"])

    # Add attributes for figure
    if "figure" not in shared_config["attributes"]:
        shared_config["attributes"]["figure"] = set()
    shared_config["attributes"]["figure"].add("class")


def process_image(config, shared_config):
    """Process image feature configuration."""
    # Add img tag
    shared_config["tags"].add("img")

    # Add attributes for img
    if "img" not in shared_config["attributes"]:
        shared_config["attributes"]["img"] = set()
    shared_config["attributes"]["img"].update(["src", "alt", "width", "height"])


def process_text_align(config, shared_config):
    """Process text alignment feature configuration."""
    # Text align adds style and class attributes to various elements
    for tag in ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"]:
        if tag not in shared_config["attributes"]:
            shared_config["attributes"][tag] = set()
        shared_config["attributes"][tag].update(["style", "class"])


def process_color_highlight(config, shared_config):
    """Process color and highlighting feature configuration."""
    # Add span tag
    shared_config["tags"].add("span")

    # Add style and class attributes for span
    if "span" not in shared_config["attributes"]:
        shared_config["attributes"]["span"] = set()
    shared_config["attributes"]["span"].update(["style", "class"])


# Default feature-to-HTML mapping with processors as the single source of truth
FEATURE_MAPPING = {
    # Core formatting
    "bold": create_simple_processor(["strong"]),
    "italic": create_simple_processor(["em"]),
    "strike": create_simple_processor(["s"]),
    "underline": create_simple_processor(["u"]),
    "subscript": create_simple_processor(["sub"]),
    "superscript": create_simple_processor(["sup"]),
    # Code features
    "code": create_simple_processor(["code"]),
    "codeBlock": process_code_block,
    # Text styling
    "color": process_color_highlight,
    "highlight": process_color_highlight,
    "textAlign": process_text_align,
    "textStyle": process_color_highlight,
    # Structure
    "heading": process_heading,
    "paragraph": create_simple_processor(["p"]),
    "hardBreak": create_simple_processor(["br"]),
    "bulletList": create_simple_processor(["ul"]),
    "orderedList": create_simple_processor(["ol"], {"ol": ["start", "type"]}),
    "listItem": create_simple_processor(["li"]),
    "blockquote": create_simple_processor(["blockquote"]),
    "horizontalRule": create_simple_processor(["hr"]),
    # Media and figures
    "image": process_image,
    "figure": process_figure,
    "caption": create_simple_processor(["figcaption"]),
    # Advanced features
    "link": process_link,
    "table": create_simple_processor(
        ["table", "tbody", "thead", "tr", "th", "td"],
        {
            "th": ["rowspan", "colspan"],
            "td": ["rowspan", "colspan"],
        },
    ),
    # Special features (these don't produce HTML elements)
    "history": create_simple_processor([]),
    "html": create_simple_processor([]),
    "typographic": create_simple_processor([]),
    "preset": create_simple_processor([]),
    "document": create_simple_processor([]),
    "text": create_simple_processor([]),
}

# Automatic dependencies (features that require other features)
FEATURE_DEPENDENCIES = {
    "bulletList": ["listItem"],
    "orderedList": ["listItem"],
    "table": ["tableRow", "tableHeader", "tableCell"],
    "figure": ["caption", "image"],
    "textAlign": ["textStyle"],
    "color": ["textStyle"],
    "highlight": ["textStyle"],
}


def expand_features(features: dict[str, Any]) -> dict[str, Any]:
    """
    Expand feature configuration by applying defaults and resolving dependencies.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Expanded feature configuration
    """

    expanded = {
        # Core features
        "document": True,
        "paragraph": True,
        "text": True,
        # Enable history by default unless explicitly disabled
        "history": True,
    }

    # Include user-specified features
    expanded.update(features)

    # Resolve dependencies
    for feature, deps in FEATURE_DEPENDENCIES.items():
        if feature in expanded and (expanded[feature] is not False):
            for dep in deps:
                if dep not in expanded:
                    expanded[dep] = True

    return expanded


def features_to_allowlist(
    features: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate HTML sanitization config from feature configuration.

    This function collects configuration from all feature processors into a unified
    configuration dictionary suitable for nh3 HTML sanitization.

    Each processor function should accept two arguments:
    1. feature_config: The feature-specific configuration
    2. shared_config: The shared configuration dictionary to update

    Processors should directly modify the shared_config dictionary with their
    required HTML elements, attributes, and other nh3 parameters.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Dictionary with sanitization config and 'js_modules' key
    """
    expanded = expand_features(features)

    # Filter out features explicitly set to False (disabled features)
    filtered_features = {
        feature: config for feature, config in expanded.items() if config is not False
    }

    # Initialize the combined configuration with empty sets
    combined_config = {
        "tags": set(),
        "attributes": {},
        # Track JavaScript modules separately as it's not for nh3
        "js_modules": set(),
    }

    # Get custom extensions
    custom_extensions = get_custom_extensions()

    # Process each enabled feature
    for feature, config in filtered_features.items():
        # Get the processor function
        processor = None

        # Check if it's a built-in feature
        if feature in FEATURE_MAPPING:
            processor = FEATURE_MAPPING[feature]
        # Or a custom extension
        elif feature in custom_extensions:
            ext_processor = custom_extensions[feature]

            if ext_processor:
                if isinstance(ext_processor, str):
                    # Import the processor function from the specified path
                    try:
                        processor = import_string(ext_processor)
                    except (ImportError, AttributeError, ValueError) as e:
                        warnings.warn(
                            f"Could not import processor function {ext_processor} for {feature}: {e}",
                            UserWarning,
                            stacklevel=2,
                        )
                else:
                    # If it's already a callable, use it directly
                    processor = ext_processor

        # Skip if we don't have a processor
        if not processor:
            continue

        # Call the processor and let it modify the config directly
        try:
            processor(config, combined_config)
        except Exception as e:
            warnings.warn(
                f"Error processing {feature}: {e}",
                UserWarning,
                stacklevel=2,
            )

    # Return the combined configuration directly with sets
    # nh3 accepts sets for tags, attributes, and url_schemes
    return combined_config
