"""
Configuration system for Django Prose Editor.

This module provides a way to define editor extensions and generate
corresponding sanitization rules for server-side HTML cleaning.
"""

from typing import Any

from django.conf import settings
from django.utils.module_loading import import_string


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
    "TableRow": html_tags([]),
    "TableHeader": html_tags([]),
    "TableCell": html_tags([]),
    # Special extensions (these don't produce HTML elements)
    "History": html_tags([]),
    "HTML": html_tags([]),
    "Typographic": html_tags([]),
    "Document": html_tags([]),
    "Text": html_tags([]),
    "Dropcursor": html_tags([]),
    "Gapcursor": html_tags([]),
    "Menu": html_tags([]),
    "NoSpellCheck": html_tags([]),
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
        "Dropcursor": True,
        "Gapcursor": True,
        "Paragraph": True,
        "Text": True,
        "Menu": True,
        "NoSpellCheck": True,
        # Enable history by default unless explicitly disabled
        "History": True,
    }

    # Include user-specified extensions
    expanded.update(extensions)

    # Filter out disabled extensions
    expanded = {
        extension: config
        for extension, config in expanded.items()
        if config is not False
    }

    # Resolve dependencies
    for extension, deps in EXTENSION_DEPENDENCIES.items():
        if extension in expanded:
            for dep in deps:
                if dep not in expanded:
                    expanded[dep] = True

    return expanded


def js_from_extensions(
    extensions: dict[str, Any],
) -> list[str]:
    """
    Get JavaScript modules required by the enabled extensions.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        List of JavaScript module paths
    """
    expanded = set(expand_extensions(extensions))
    js_modules = set()

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])
    for group in extensions:
        if (js := group.get("js")) and expanded & group["extensions"].keys():
            js_modules.update(js)

    return list(js_modules)


def allowlist_from_extensions(
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
        Dictionary with sanitization config
    """
    expanded = expand_extensions(extensions)

    # Initialize the combined configuration with empty sets
    nh3_config = {
        "tags": set(),
        "attributes": {},
    }

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])
    processors = EXTENSION_MAPPING.copy()
    for group in extensions:
        processors |= group["extensions"]

    for extension, config in expanded.items():
        processor = processors[extension]
        if isinstance(processor, str):
            processors[extension] = import_string(extension)
        processor(config, nh3_config)

    return nh3_config
