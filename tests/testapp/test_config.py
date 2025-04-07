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
        self.assertIn("tags", allowlist)
        self.assertIn("attributes", allowlist)

        # Check that the specific tags are included
        self.assertIn("strong", allowlist["tags"])  # Bold
        self.assertIn("em", allowlist["tags"])  # Italic
        self.assertIn("a", allowlist["tags"])  # Link

        # Check that link attributes are included
        self.assertIn("a", allowlist["attributes"])
        self.assertIn("href", allowlist["attributes"]["a"])
        self.assertIn("rel", allowlist["attributes"]["a"])
        self.assertIn("title", allowlist["attributes"]["a"])

        # Verify that js_modules is not included in the allowlist
        self.assertNotIn("js_modules", allowlist)

    def test_allowlist_from_extensions_complex(self):
        """Test allowlist_from_extensions with more complex extension configurations."""
        extensions = {
            "Heading": {"levels": [1, 2]},
            "CodeBlock": {"languageClassPrefix": "language-"},
            "Link": {"enableTarget": True, "protocols": ["https", "mailto"]},
        }

        allowlist = allowlist_from_extensions(extensions)

        # Check heading levels are limited to h1, h2
        self.assertIn("h1", allowlist["tags"])
        self.assertIn("h2", allowlist["tags"])
        self.assertNotIn("h3", allowlist["tags"])

        # Check code block with language classes
        self.assertIn("pre", allowlist["tags"])
        self.assertIn("code", allowlist["tags"])
        self.assertIn("pre", allowlist["attributes"])
        self.assertIn("class", allowlist["attributes"]["pre"])

        # Check link with target and protocols
        self.assertIn("a", allowlist["tags"])
        self.assertIn("target", allowlist["attributes"]["a"])
        self.assertIn("url_schemes", allowlist)
        self.assertIn("https", allowlist["url_schemes"])
        self.assertIn("mailto", allowlist["url_schemes"])

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
        self.assertIsInstance(js_modules, list)

        # Should contain the custom extensions' JS modules
        self.assertIn(static_lazy("testapp/blue-bold.js"), js_modules)
        self.assertIn(static_lazy("testapp/other.js"), js_modules)
        self.assertIn(static_lazy("testapp/another.js"), js_modules)

        # Test with dependencies
        extensions = {
            "Table": True,  # This should automatically include TableRow, TableCell, etc.
        }

        js_modules = js_from_extensions(extensions)

        # Dependencies don't have their own JS modules, so this should be an empty list
        self.assertEqual(js_modules, [])

    def test_js_from_extensions_with_invalid_extension(self):
        """Test that js_from_extensions handles invalid extensions gracefully."""
        extensions = {
            "NonExistentExtension": True,
        }

        js_modules = js_from_extensions(extensions)

        # Should still return a list, just empty
        self.assertIsInstance(js_modules, list)
        self.assertEqual(js_modules, [])

    def test_expand_extensions_with_dependencies(self):
        """Test that expand_extensions correctly adds dependent extensions."""
        extensions = {
            "Bold": True,
            "Table": True,
            "Figure": True,
        }

        expanded = expand_extensions(extensions)

        # Original extensions should be preserved
        self.assertIn("Bold", expanded)
        self.assertIn("Table", expanded)
        self.assertIn("Figure", expanded)

        # Dependencies should be added
        self.assertIn("TableRow", expanded)
        self.assertIn("TableHeader", expanded)
        self.assertIn("TableCell", expanded)
        self.assertIn("Caption", expanded)
        self.assertIn("Image", expanded)

        # Core extensions should always be included
        self.assertIn("Document", expanded)
        self.assertIn("Paragraph", expanded)
        self.assertIn("Text", expanded)

    def test_disabled_extensions(self):
        """Test that disabled extensions are properly handled."""
        extensions = {
            "Bold": True,
            "Italic": False,  # Explicitly disabled
            "Table": True,
        }

        expanded = expand_extensions(extensions)

        # Enabled extensions should be present
        self.assertIn("Bold", expanded)
        self.assertIn("Table", expanded)

        # Disabled extensions should be removed
        self.assertNotIn("Italic", expanded)

        # Check that disabled extensions don't affect the allowlist
        allowlist = allowlist_from_extensions(extensions)
        self.assertIn("strong", allowlist["tags"])  # Bold
        self.assertNotIn("em", allowlist["tags"])  # Italic should be excluded
