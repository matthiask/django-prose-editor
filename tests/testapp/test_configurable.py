"""Tests for the new configurable prose editor field."""

import json

from django.forms.models import ModelForm
from django.test import TestCase

from testapp.models import ConfigurableProseEditorModel


class ConfigurableFormTestCase(TestCase):
    """Tests for the configurable field form rendering."""

    def test_dependencies_expanded(self):
        """Test that all dependencies are properly expanded in raw_features."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        # Get the expanded features from the widget attributes

        context = widget.get_context("description", "", {})
        expanded_features = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # Make sure the expanded_features include all dependencies
        # The original features only had bold, italic, and table
        self.assertIn("bold", expanded_features)
        self.assertIn("italic", expanded_features)
        self.assertIn("table", expanded_features)

        # The following should be included as dependencies
        self.assertIn("tableRow", expanded_features)
        self.assertIn("tableHeader", expanded_features)
        self.assertIn("tableCell", expanded_features)

        # Core features should always be included
        self.assertIn("paragraph", expanded_features)
        self.assertIn("document", expanded_features)
        self.assertIn("text", expanded_features)

    def test_heading_levels_config(self):
        """Test that heading levels are properly passed to the widget."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        # Get the expanded features from the widget attributes

        context = widget.get_context("description", "", {})
        expanded_features = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # Check that heading is in expanded_features with the proper configuration
        self.assertIn("heading", expanded_features)
        self.assertEqual(expanded_features["heading"]["levels"], [1, 2, 3])

        # Check that we're using the config parameter for the expanded features
        self.assertEqual(widget.config, expanded_features)

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

        # Test link sanitization - links are not in the features list,
        # so they should be removed
        html = '<p>Link with <a href="https://example.com" target="_blank" rel="noopener">attributes</a></p>'
        form = TestForm(data={"description": html})
        self.assertTrue(form.is_valid())
        instance = form.save()
        sanitized = instance.description
        # Link tag should be removed since it's not in the features
        self.assertNotIn("<a href", sanitized, "link tag should be removed")
        self.assertNotIn(
            'target="_blank"', sanitized, "target attribute should be removed"
        )
        # But the content should still be there
        self.assertIn(
            "Link with attributes", sanitized, "link text should be preserved"
        )
