"""
Configuration system for Django Prose Editor.

This module provides a way to define editor extensions and generate
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
    - 'extensions': A dictionary mapping extension names to processor callables or dotted paths (required)

    This structure allows for extensions that provide multiple related extensions
    that share the same JavaScript assets. For example, a table extension might
    provide 'Table', 'TableRow', and 'TableCell' extensions that all use the same JavaScript files.

    Returns:
        Tuple of (extension_processors, js_assets) where:
        - extension_processors is a dictionary mapping extension names to processor callables
        - js_assets is a dictionary mapping extension names to lists of JavaScript assets
    """
    extension_processors = {}
    js_assets = {}

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])

    # Process each extension group
    for extension_group in extensions:
        js = extension_group.get("js", [])
        extensions_dict = extension_group.get("extensions", {})

        # Add all extension processors to the global map
        for extension_name, processor in extensions_dict.items():
            extension_processors[extension_name] = processor

            # Associate JavaScript assets with each extension
            if js:
                js_assets[extension_name] = list(js)

    return extension_processors, js_assets


# Extension processors
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


def html_tags(tags, attributes=None):
    """
    Create a simple processor function that adds tags and attributes to the sanitization config.

    Args:
        tags: List of HTML tags
        attributes: Dict mapping tags to allowed attributes

    Returns:
        A processor function that updates the shared config
    """

    def processor(extension_config, shared_config):
        add_tags_and_attributes(shared_config, tags, attributes)

    return processor


def process_heading(config, shared_config):
    """Process Heading extension configuration."""
    levels = (
        c if isinstance(config, dict) and (c := config.get("levels")) else range(1, 7)
    )
    tags = [f"h{level}" for level in levels]
    add_tags_and_attributes(shared_config, tags, None)


def process_link(config, shared_config):
    """Process Link extension configuration."""
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
    """Process CodeBlock extension configuration."""
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
    """Process Figure extension configuration."""
    # Prepare tags and attributes
    tags = ["figure", "figcaption", "img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
        "figure": ["class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_image(config, shared_config):
    """Process Image extension configuration."""
    # Prepare tags and attributes
    tags = ["img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_text_align(config, shared_config):
    """Process TextAlign extension configuration."""
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
    """Process Color and Highlight extension configuration."""
    # Prepare tags and attributes
    tags = ["span"]
    attributes = {
        "span": ["style", "class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


# Default extension mapping with processors as the single source of truth
EXTENSION_MAPPING = {
    # Core formatting
    "Bold": html_tags(["strong"]),
    "Italic": html_tags(["em"]),
    "Strike": html_tags(["s"]),
    "Underline": html_tags(["u"]),
    "Subscript": html_tags(["sub"]),
    "Superscript": html_tags(["sup"]),
    # Code extensions
    "Code": html_tags(["code"]),
    "CodeBlock": process_code_block,
    # Text styling
    "Color": process_color_highlight,
    "Highlight": process_color_highlight,
    "TextAlign": process_text_align,
    "TextStyle": process_color_highlight,
    # Structure
    "Heading": process_heading,
    "Paragraph": html_tags(["p"]),
    "HardBreak": html_tags(["br"]),
    "BulletList": html_tags(["ul"]),
    "OrderedList": html_tags(["ol"], {"ol": ["start", "type"]}),
    "ListItem": html_tags(["li"]),
    "Blockquote": html_tags(["blockquote"]),
    "HorizontalRule": html_tags(["hr"]),
    # Media and figures
    "Image": process_image,
    "Figure": process_figure,
    "Caption": html_tags(["figcaption"]),
    # Advanced extensions
    "Link": process_link,
    "Table": html_tags(
        ["table", "tbody", "thead", "tr", "th", "td"],
        {
            "th": ["rowspan", "colspan"],
            "td": ["rowspan", "colspan"],
        },
    ),
    # Special extensions (these don't produce HTML elements)
    "History": html_tags([]),
    "HTML": html_tags([]),
    "Typographic": html_tags([]),
    "Document": html_tags([]),
    "Text": html_tags([]),
}

# Automatic dependencies (extensions that require other extensions)
EXTENSION_DEPENDENCIES = {
    "BulletList": ["ListItem"],
    "OrderedList": ["ListItem"],
    "Table": ["TableRow", "TableHeader", "TableCell"],
    "Figure": ["Caption", "Image"],
    "TextAlign": ["TextStyle"],
    "Color": ["TextStyle"],
    "Highlight": ["TextStyle"],
}


def expand_extensions(extensions: dict[str, Any]) -> dict[str, Any]:
    """
    Expand extension configuration by applying defaults and resolving dependencies.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        Expanded extension configuration
    """

    expanded = {
        # Core extensions
        "Document": True,
        "Paragraph": True,
        "Text": True,
        # Enable history by default unless explicitly disabled
        "History": True,
    }

    # Include user-specified extensions
    expanded.update(extensions)

    # Resolve dependencies
    for extension, deps in EXTENSION_DEPENDENCIES.items():
        if extension in expanded and (expanded[extension] is not False):
            for dep in deps:
                if dep not in expanded:
                    expanded[dep] = True

    return expanded


def extensions_to_allowlist(
    extensions: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate HTML sanitization config from extension configuration.

    This function collects configuration from all extension processors into a unified
    configuration dictionary suitable for nh3 HTML sanitization.

    Each processor function should accept two arguments:
    1. extension_config: The extension-specific configuration
    2. shared_config: The shared configuration dictionary to update

    Processors should directly modify the shared_config dictionary with their
    required HTML elements, attributes, and other nh3 parameters.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        Dictionary with sanitization config and 'js_modules' key
    """
    expanded = expand_extensions(extensions)

    # Filter out extensions explicitly set to False (disabled extensions)
    filtered_extensions = {
        extension: config
        for extension, config in expanded.items()
        if config is not False
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

    # Process each enabled extension
    for extension, config in filtered_extensions.items():
        # Get the processor function
        processor = None

        # Check if it's a built-in extension
        if extension in EXTENSION_MAPPING:
            processor = EXTENSION_MAPPING[extension]
        # Or a custom extension
        elif extension in custom_extensions:
            ext_processor = custom_extensions[extension]

            if ext_processor:
                if isinstance(ext_processor, str):
                    # Import the processor function from the specified path
                    try:
                        processor = import_string(ext_processor)
                    except (ImportError, AttributeError, ValueError) as e:
                        warnings.warn(
                            f"Could not import processor function {ext_processor} for {extension}: {e}",
                            UserWarning,
                            stacklevel=2,
                        )
                else:
                    # If it's already a callable, use it directly
                    processor = ext_processor

            # Add JS assets for this extension if available
            if extension in js_assets_map:
                if "js_modules" not in combined_config:
                    combined_config["js_modules"] = set()
                combined_config["js_modules"].update(js_assets_map[extension])

        # Skip if we don't have a processor
        if not processor:
            continue

        # Call the processor and let it modify the config directly
        try:
            processor(config, combined_config)
        except Exception as e:
            warnings.warn(
                f"Error processing {extension}: {e}",
                UserWarning,
                stacklevel=2,
            )

    # Return the combined configuration directly with sets
    # nh3 accepts sets for tags, attributes, and url_schemes
    return combined_config
