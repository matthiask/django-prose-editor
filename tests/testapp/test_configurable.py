"""Tests for the new configurable prose editor field."""

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

        # Make sure the raw_features include all dependencies
        # The original features only had bold, italic, and table
        self.assertIn("bold", widget.raw_features)
        self.assertIn("italic", widget.raw_features)
        self.assertIn("table", widget.raw_features)

        # The following should be included as dependencies
        self.assertIn("tableRow", widget.raw_features)
        self.assertIn("tableHeader", widget.raw_features)
        self.assertIn("tableCell", widget.raw_features)

        # Core features should always be included
        self.assertIn("paragraph", widget.raw_features)
        self.assertIn("document", widget.raw_features)
        self.assertIn("text", widget.raw_features)

    def test_heading_levels_config(self):
        """Test that heading levels are properly passed to the widget."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        # Check that heading is in raw_features with the proper configuration
        self.assertIn("heading", widget.raw_features)
        self.assertEqual(widget.raw_features["heading"]["levels"], [1, 2, 3])

        # Check that we're using an empty config now
        self.assertEqual(widget.config, {})
