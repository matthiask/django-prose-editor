"""Tests for the configuration module."""

from django.test import TestCase, override_settings
from js_asset import static_lazy

from django_prose_editor.config import (
    allowlist_from_extensions,
    expand_extensions,
    html_tags,
    js_from_extensions,
)


class ConfigFunctionsTestCase(TestCase):
    """Tests for the configuration helper functions."""

    def test_allowlist_from_extensions_basic(self):
        """Test that allowlist_from_extensions generates the correct HTML allowlist."""
        extensions = {
            "Bold": True,
            "Italic": True,
            "Link": True,
        }

        allowlist = allowlist_from_extensions(extensions)

        # Check that the core tags are included
        assert "tags" in allowlist
        assert "attributes" in allowlist

        # Check that the specific tags are included
        assert "strong" in allowlist["tags"]  # Bold
        assert "em" in allowlist["tags"]  # Italic
        assert "a" in allowlist["tags"]  # Link

        # Check that link attributes are included
        assert "a" in allowlist["attributes"]
        assert "href" in allowlist["attributes"]["a"]
        assert "rel" in allowlist["attributes"]["a"]
        assert "title" in allowlist["attributes"]["a"]

        # Verify that js_modules is not included in the allowlist
        assert "js_modules" not in allowlist

    def test_allowlist_from_extensions_complex(self):
        """Test allowlist_from_extensions with more complex extension configurations."""
        extensions = {
            "Heading": {"levels": [1, 2]},
            "CodeBlock": {"languageClassPrefix": "language-"},
            "Link": {"enableTarget": True, "protocols": ["https", "mailto"]},
        }

        allowlist = allowlist_from_extensions(extensions)

        # Check heading levels are limited to h1, h2
        assert "h1" in allowlist["tags"]
        assert "h2" in allowlist["tags"]
        assert "h3" not in allowlist["tags"]

        # Check code block with language classes
        assert "pre" in allowlist["tags"]
        assert "code" in allowlist["tags"]
        assert "pre" in allowlist["attributes"]
        assert "class" in allowlist["attributes"]["pre"]

        # Check link with target and protocols
        assert "a" in allowlist["tags"]
        assert "target" in allowlist["attributes"]["a"]
        assert "url_schemes" in allowlist
        assert "https" in allowlist["url_schemes"]
        assert "mailto" in allowlist["url_schemes"]

    @override_settings(
        DJANGO_PROSE_EDITOR_EXTENSIONS=[
            {
                "js": [static_lazy("testapp/blue-bold.js")],
                "extensions": {
                    "CustomExt": html_tags(tags=["div"], attributes={"div": ["class"]})
                },
            },
            {
                "js": [
                    static_lazy("testapp/other.js"),
                    static_lazy("testapp/another.js"),
                ],
                "extensions": {
                    "OtherExt": html_tags(
                        tags=["span"], attributes={"span": ["data-test"]}
                    )
                },
            },
        ]
    )
    def test_js_from_extensions(self):
        """Test that js_from_extensions returns the correct JS modules."""
        extensions = {
            "Bold": True,
            "Italic": True,
            "CustomExt": True,
            "OtherExt": True,
        }

        js_modules = js_from_extensions(extensions)

        # Should be a list of JS modules
        assert isinstance(js_modules, list)

        # Should contain the custom extensions' JS modules
        assert static_lazy("testapp/blue-bold.js") in js_modules
        assert static_lazy("testapp/other.js") in js_modules
        assert static_lazy("testapp/another.js") in js_modules

        # Test with dependencies
        extensions = {
            "Table": True,  # This should automatically include TableRow, TableCell, etc.
        }

        js_modules = js_from_extensions(extensions)

        # Dependencies don't have their own JS modules, so this should be an empty list
        assert js_modules == []

    def test_js_from_extensions_with_invalid_extension(self):
        """Test that js_from_extensions handles invalid extensions gracefully."""
        extensions = {
            "NonExistentExtension": True,
        }

        js_modules = js_from_extensions(extensions)

        # Should still return a list, just empty
        assert isinstance(js_modules, list)
        assert js_modules == []

    def test_expand_extensions_with_dependencies(self):
        """Test that expand_extensions correctly adds dependent extensions."""
        extensions = {
            "Bold": True,
            "Table": True,
            "Figure": True,
        }

        expanded = expand_extensions(extensions)

        # Original extensions should be preserved
        assert "Bold" in expanded
        assert "Table" in expanded
        assert "Figure" in expanded

        # Dependencies should be added
        assert "TableRow" in expanded
        assert "TableHeader" in expanded
        assert "TableCell" in expanded
        assert "Caption" in expanded
        assert "Image" in expanded

        # Core extensions should always be included
        assert "Document" in expanded
        assert "Paragraph" in expanded
        assert "Text" in expanded

    def test_disabled_extensions(self):
        """Test that disabled extensions are properly handled."""
        extensions = {
            "Bold": True,
            "Italic": False,  # Explicitly disabled
            "Table": True,
        }

        expanded = expand_extensions(extensions)

        # Enabled extensions should be present
        assert "Bold" in expanded
        assert "Table" in expanded

        # Disabled extensions should be removed
        assert "Italic" not in expanded

        # Check that disabled extensions don't affect the allowlist
        allowlist = allowlist_from_extensions(extensions)
        assert "strong" in allowlist["tags"]  # Bold
        assert "em" not in allowlist["tags"]  # Italic should be excluded
