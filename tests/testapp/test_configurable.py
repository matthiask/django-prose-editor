"""Tests for the new configurable prose editor field."""

import json

from django.forms.models import ModelForm
from django.test import TestCase

from testapp.models import ConfigurableProseEditorModel


class ConfigurableFormTestCase(TestCase):
    """Tests for the configurable field form rendering."""

    def test_dependencies_expanded(self):
        """Test that all dependencies are properly expanded in raw_extensions."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        context = widget.get_context("description", "", {})
        config = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # The original extensions only had Bold, Italic, and Table
        self.assertIn("Bold", config["extensions"])
        self.assertIn("Italic", config["extensions"])
        self.assertIn("Table", config["extensions"])

        # The custom BlueBold extension should also be included
        self.assertIn("BlueBold", config["extensions"])

        # The following should be included as dependencies
        self.assertIn("TableRow", config["extensions"])
        self.assertIn("TableHeader", config["extensions"])
        self.assertIn("TableCell", config["extensions"])

        # Core extensions should always be included
        self.assertIn("Paragraph", config["extensions"])
        self.assertIn("Document", config["extensions"])
        self.assertIn("Text", config["extensions"])

    def test_heading_levels_config(self):
        """Test that heading levels are properly passed to the widget."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        # Get the expanded extensions from the widget attributes

        context = widget.get_context("description", "", {})
        config = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # Check that Heading is in extensions with the proper configuration
        self.assertIn("Heading", config["extensions"])
        self.assertEqual(config["extensions"]["Heading"]["levels"], [1, 2, 3])

        self.assertEqual(
            config["extensions"],
            widget.config["extensions"]
            | {
                "Document": True,
                "Dropcursor": True,
                "Gapcursor": True,
                "Paragraph": True,
                "Text": True,
                "Menu": True,
                "NoSpellCheck": True,
                # Enable history by default unless explicitly disabled
                "History": True,
                "TableRow": True,
                "TableCell": True,
                "TableHeader": True,
            },
        )

    def test_sanitization_works(self):
        """Test that basic sanitization works correctly with ConfigurableProseEditorField."""

        # Create a form instance
        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        # Test that script tags are removed
        html = "<p>Text with <script>alert('XSS');</script></p>"
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())

        # Create and save the model instance to trigger sanitization
        instance = form.save()
        sanitized = instance.description
        self.assertEqual(
            "<p>Text with </p>", sanitized, "Script tags should be removed"
        )

        # Test that basic formatting is preserved
        html = "<p><strong>Bold</strong> and <em>italic</em> text</p>"
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        sanitized = instance.description
        self.assertEqual(
            "<p><strong>Bold</strong> and <em>italic</em> text</p>",
            sanitized,
            "Standard formatting should be preserved",
        )

        # Test that table elements are preserved
        html = "<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>"
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        sanitized = instance.description
        self.assertEqual(
            "<table><tbody><tr><th>Header</th></tr><tr><td>Cell</td></tr></tbody></table>",
            sanitized,
            "Table elements should be preserved with proper structure",
        )

        # Heading levels are configured as [1, 2, 3] in the model
        # Check that h1, h2, h3 are preserved but h4 is filtered out
        html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4>"
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        instance.full_clean()
        sanitized = instance.description

        # Check that h1, h2, h3 tags are preserved
        self.assertIn("<h1>", sanitized, "h1 should be preserved")
        self.assertIn("<h2>", sanitized, "h2 should be preserved")
        self.assertIn("<h3>", sanitized, "h3 should be preserved")

        # h4 should be removed since it's not in the allowed levels [1, 2, 3]
        self.assertNotIn("<h4>", sanitized, "h4 should be removed")
        # But the content should still be there
        self.assertIn("H4", sanitized, "content from h4 should still exist")

        # Test that unsupported tags (sub, sup) are removed
        html = "<p>Normal text with <sub>subscript</sub> and <sup>superscript</sup></p>"
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        sanitized = instance.description
        self.assertNotIn("<sub>", sanitized, "sub tags should be removed")
        self.assertNotIn("<sup>", sanitized, "sup tags should be removed")
        self.assertIn("subscript", sanitized, "content from sub should still exist")
        self.assertIn("superscript", sanitized, "content from sup should still exist")

        # Test link sanitization - Link is not in the extensions list,
        # so it should be removed
        html = '<p>Link with <a href="https://example.com" target="_blank" rel="noopener">attributes</a></p>'
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        sanitized = instance.description
        # Link tag should be removed since it's not in the extensions
        self.assertNotIn("<a href", sanitized, "link tag should be removed")
        self.assertNotIn(
            'target="_blank"', sanitized, "target attribute should be removed"
        )
        # But the content should still be there
        self.assertIn(
            "Link with attributes", sanitized, "link text should be preserved"
        )
