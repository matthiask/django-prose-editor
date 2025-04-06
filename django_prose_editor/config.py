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
        Dictionary mapping extension names to their configurations
    """

    return getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", {})


# Feature processors
# These functions return allowlist information based on feature configuration
def create_simple_processor(tags, attributes=None, js_module=None):
    """
    Create a simple processor function that returns a fixed set of tags and attributes.

    Args:
        tags: List of HTML tags
        attributes: Dict mapping tags to allowed attributes
        js_module: Optional URL to JavaScript module implementing this extension

    Returns:
        A processor function
    """

    def processor(config):
        result = {
            "tags": tags,
            "attributes": attributes or {},
        }

        # Include JavaScript module if provided
        if js_module:
            result["js_module"] = js_module

        return result

    return processor


def process_heading(config):
    """Process heading feature configuration."""
    tags = ["h1", "h2", "h3", "h4", "h5", "h6"]

    # Filter tags based on levels if specified
    if isinstance(config, dict) and "levels" in config:
        levels = config["levels"]
        tags = [f"h{level}" for level in levels if 1 <= level <= 6]

    return {
        "tags": tags,
        "attributes": {},
    }


def process_link(config):
    """Process link feature configuration."""
    attributes = {"a": ["href", "rel"]}

    # Include target attribute unless explicitly disabled
    target_allowed = True
    if isinstance(config, dict) and "allowTargetBlank" in config:
        target_allowed = bool(config["allowTargetBlank"])

    if target_allowed:
        attributes["a"].append("target")

    return {
        "tags": ["a"],
        "attributes": attributes,
    }


# Additional processors for other extensions
def process_code_block(config):
    """Process code block feature configuration."""
    attributes = {}

    # Include language attribute if supported
    if isinstance(config, dict) and config.get("languageClassPrefix"):
        attributes["pre"] = ["class"]
        attributes["code"] = ["class"]

    return {
        "tags": ["pre", "code"],
        "attributes": attributes,
    }


def process_figure(config):
    """Process figure feature configuration."""
    return {
        "tags": ["figure", "figcaption", "img"],
        "attributes": {
            "img": ["src", "alt", "width", "height"],
            "figure": ["class"],
        },
    }


def process_image(config):
    """Process image feature configuration."""
    return {
        "tags": ["img"],
        "attributes": {
            "img": ["src", "alt", "width", "height"],
        },
    }


def process_text_align(config):
    """Process text alignment feature configuration."""
    return {
        "tags": [],  # Text align typically uses classes, not new tags
        "attributes": {
            "p": ["style", "class"],
            "h1": ["style", "class"],
            "h2": ["style", "class"],
            "h3": ["style", "class"],
            "h4": ["style", "class"],
            "h5": ["style", "class"],
            "h6": ["style", "class"],
            "blockquote": ["style", "class"],
        },
    }


def process_color_highlight(config):
    """Process color and highlighting feature configuration."""
    return {
        "tags": ["span"],
        "attributes": {
            "span": ["style", "class"],
        },
    }


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
) -> dict[str, list[str] | dict[str, list[str]] | list[str]]:
    """
    Generate HTML sanitization allowlist from feature configuration.

    Args:
        features: Dictionary of feature configurations

    Returns:
        Dictionary with 'tags', 'attributes', and 'js_modules' keys
    """
    expanded = expand_features(features)

    # Filter out features explicitly set to False (disabled features)
    filtered_features = {
        feature: config for feature, config in expanded.items() if config is not False
    }

    allowed_tags: set[str] = set()
    allowed_attributes: dict[str, set[str]] = {}
    js_modules: set[str] = set()

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
            ext_config = custom_extensions[feature]
            processor_path = ext_config.get("processor")

            if processor_path:
                if isinstance(processor_path, str):
                    # Import the processor function from the specified path
                    try:
                        processor = import_string(processor_path)
                    except (ImportError, AttributeError, ValueError) as e:
                        warnings.warn(
                            f"Could not import processor function {processor_path} for {feature}: {e}",
                            UserWarning,
                            stacklevel=2,
                        )
                else:
                    # If it's already a callable, use it directly
                    processor = processor_path
            else:
                # Create a simple processor from the tags and attributes
                tags = ext_config.get("tags", [])
                attributes = ext_config.get("attributes", {})
                processor = create_simple_processor(tags, attributes)

        # Skip if we don't have a processor
        if not processor:
            continue

        # Call the processor to get allowlist information
        try:
            result = processor(config)
            if not isinstance(result, dict) or "tags" not in result:
                warnings.warn(
                    f"Processor for {feature} returned invalid result: {result}",
                    UserWarning,
                    stacklevel=2,
                )
                continue

            # Add tags
            allowed_tags.update(result.get("tags", []))

            # Add attributes
            for tag, attrs in result.get("attributes", {}).items():
                if tag not in allowed_attributes:
                    allowed_attributes[tag] = set()
                allowed_attributes[tag].update(attrs)

            # Add JavaScript modules if present
            if "js_module" in result:
                js_modules.add(result["js_module"])
        except Exception as e:
            warnings.warn(
                f"Error processing {feature}: {e}",
                UserWarning,
                stacklevel=2,
            )

    # Convert sets to lists for the final output
    return {
        "tags": sorted(allowed_tags),
        "attributes": {tag: sorted(attrs) for tag, attrs in allowed_attributes.items()},
        "js_modules": sorted(js_modules),
    }
