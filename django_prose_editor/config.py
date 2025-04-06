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


# Feature processors
# These functions return allowlist information based on feature configuration
def create_simple_processor(tags, attributes=None):
    """
    Create a simple processor function that returns a fixed set of tags and attributes.

    Args:
        tags: List of HTML tags
        attributes: Dict mapping tags to allowed attributes

    Returns:
        A processor function
    """

    def processor(config):
        return {
            "tags": tags,
            "attributes": attributes or {},
        }

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
        "code": True,
        "codeBlock": True,
        "paragraph": True,
        "heading": {"levels": [1, 2, 3, 4, 5, 6]},
        "bulletList": True,
        "orderedList": True,
        "blockquote": True,
        "horizontalRule": True,
        "hardBreak": True,
        "link": {"allowTargetBlank": True},
        "table": True,
        "image": True,
        "figure": True,
        "color": True,
        "highlight": True,
        "textAlign": True,
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

    # Enable history by default unless explicitly disabled
    if "history" not in expanded:
        expanded["history"] = True

    # Resolve dependencies
    for feature, deps in FEATURE_DEPENDENCIES.items():
        if feature in expanded and expanded[feature]:
            for dep in deps:
                if dep not in expanded:
                    expanded[dep] = True

    return expanded


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

    # Filter out falsy features and special features
    filtered_features = {
        feature: config
        for feature, config in expanded.items()
        if config and feature not in ("history", "html", "typographic", "preset")
    }

    allowed_tags: set[str] = set()
    allowed_attributes: dict[str, set[str]] = {}

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
                        module_path, func_name = processor_path.rsplit(".", 1)
                        module = __import__(module_path, fromlist=[func_name])
                        processor = getattr(module, func_name)
                    except (ImportError, AttributeError, ValueError) as e:
                        import warnings

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
                import warnings

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
        except Exception as e:
            import warnings

            warnings.warn(
                f"Error processing {feature}: {e}",
                UserWarning,
                stacklevel=2,
            )

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
