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
