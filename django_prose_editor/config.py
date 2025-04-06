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

    The DJANGO_PROSE_EDITOR_EXTENSIONS setting should be a list of dictionaries,
    where each dictionary contains:
    - 'js': A list of JavaScript assets (required)
    - 'features': A dictionary mapping feature names to processor callables or dotted paths (required)

    This structure allows for extensions that provide multiple related features
    that share the same JavaScript assets. For example, a table extension might
    provide 'table', 'tableRow', and 'tableCell' features that all use the same JavaScript files.

    Returns:
        Tuple of (feature_processors, js_assets) where:
        - feature_processors is a dictionary mapping feature names to processor callables
        - js_assets is a dictionary mapping feature names to lists of JavaScript assets
    """
    feature_processors = {}
    js_assets = {}

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])

    # Process each extension group
    for extension_group in extensions:
        js = extension_group.get("js", [])
        features = extension_group.get("features", {})

        # Add all feature processors to the global map
        for feature_name, processor in features.items():
            feature_processors[feature_name] = processor

            # Associate JavaScript assets with each feature
            if js:
                js_assets[feature_name] = list(js)

    return feature_processors, js_assets


# Feature processors
# These functions update a shared sanitization config


def add_tags_and_attributes(shared_config, tags, attributes):
    # Add tags to the config
    shared_config["tags"].update(tags)

    # Add attributes to the config
    if attributes:
        for tag, allowed_attrs in attributes.items():
            if tag not in shared_config["attributes"]:
                shared_config["attributes"][tag] = set()
            shared_config["attributes"][tag].update(allowed_attrs)


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
        add_tags_and_attributes(shared_config, tags, attributes)

        # Add JavaScript module if provided
        if js_module:
            shared_config["js_modules"].add(js_module)

    return processor


def process_heading(config, shared_config):
    """Process heading feature configuration."""
    levels = (
        c["levels"]
        if isinstance(config, dict) and (c := config.get("levels"))
        else range(1, 7)
    )
    tags = [f"h{level}" for level in levels]
    add_tags_and_attributes(shared_config, tags, None)


def process_link(config, shared_config):
    """Process link feature configuration."""
    # Prepare tags and attributes
    tags = ["a"]
    attributes = {"a": ["href", "rel", "title"]}
    # If rel is in the list of allowed attributes link_rel has to be set to
    # None.
    shared_config["link_rel"] = None

    # Include target attribute unless explicitly disabled
    target_allowed = True
    if isinstance(config, dict):
        if "enableTarget" in config:
            target_allowed = bool(config["enableTarget"])

        # Include URL schemes if specified (for nh3 sanitization)
        if "protocols" in config:
            if "url_schemes" not in shared_config:
                shared_config["url_schemes"] = set()
            shared_config["url_schemes"].update(config["protocols"])

    # Add target attribute if allowed
    if target_allowed:
        attributes["a"].append("target")

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


# Additional processors for other extensions
def process_code_block(config, shared_config):
    """Process code block feature configuration."""
    # Prepare tags and attributes
    tags = ["pre", "code"]
    attributes = {}

    # Include language attribute if supported
    if isinstance(config, dict) and config.get("languageClassPrefix"):
        attributes["pre"] = ["class"]
        attributes["code"] = ["class"]

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_figure(config, shared_config):
    """Process figure feature configuration."""
    # Prepare tags and attributes
    tags = ["figure", "figcaption", "img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
        "figure": ["class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_image(config, shared_config):
    """Process image feature configuration."""
    # Prepare tags and attributes
    tags = ["img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_text_align(config, shared_config):
    """Process text alignment feature configuration."""
    # Text align typically uses classes, not new tags
    tags = []
    # Text align adds style and class attributes to various elements
    attributes = {
        "p": ["style", "class"],
        "h1": ["style", "class"],
        "h2": ["style", "class"],
        "h3": ["style", "class"],
        "h4": ["style", "class"],
        "h5": ["style", "class"],
        "h6": ["style", "class"],
        "blockquote": ["style", "class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_color_highlight(config, shared_config):
    """Process color and highlighting feature configuration."""
    # Prepare tags and attributes
    tags = ["span"]
    attributes = {
        "span": ["style", "class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


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

    # Get custom extensions and their JS assets
    custom_extensions, js_assets_map = get_custom_extensions()

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

            # Add JS assets for this feature if available
            if feature in js_assets_map:
                if "js_modules" not in combined_config:
                    combined_config["js_modules"] = set()
                combined_config["js_modules"].update(js_assets_map[feature])

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
