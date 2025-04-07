from django import forms
from django.contrib.admin import widgets
from django.test import TestCase

from django_prose_editor.fields import ProseEditorFormField, _is
from django_prose_editor.widgets import AdminProseEditorWidget, ProseEditorWidget


class CustomWidget(forms.Textarea):
    """A custom widget that is not a ProseEditorWidget."""


class IsHelperFunctionTest(TestCase):
    def test_is_function(self):
        """Test the _is helper function for widget type checking."""
        # Test with classes
        self.assertTrue(_is(ProseEditorWidget, ProseEditorWidget))
        self.assertTrue(_is(CustomWidget, forms.Textarea))
        self.assertFalse(_is(CustomWidget, ProseEditorWidget))

        # Test with instances
        self.assertTrue(_is(ProseEditorWidget(), ProseEditorWidget))
        self.assertTrue(_is(CustomWidget(), forms.Textarea))
        self.assertFalse(_is(ProseEditorWidget(), widgets.AdminTextareaWidget))


class ProseEditorFormFieldTest(TestCase):
    def test_widget_handling(self):
        """Test the widget handling in ProseEditorFormField."""
        # Test when widget is None (default case, line 80 branch)
        field = ProseEditorFormField()
        self.assertIsInstance(field.widget, ProseEditorWidget)

        # Test when widget is a class that is not a ProseEditorWidget (line 81 branch)
        field = ProseEditorFormField(widget=CustomWidget)
        self.assertIsInstance(field.widget, ProseEditorWidget)

        # Test when widget is an instance that is not a ProseEditorWidget (line 81 branch)
        field = ProseEditorFormField(widget=CustomWidget())
        self.assertIsInstance(field.widget, ProseEditorWidget)

        # Test with AdminTextareaWidget class (line 79 branch)
        field = ProseEditorFormField(widget=widgets.AdminTextareaWidget)
        self.assertIsInstance(field.widget, AdminProseEditorWidget)

        # Test with AdminTextareaWidget instance (line 79 branch)
        field = ProseEditorFormField(widget=widgets.AdminTextareaWidget())
        self.assertIsInstance(field.widget, AdminProseEditorWidget)

        # For completeness, also test with a ProseEditorWidget class and instance
        field = ProseEditorFormField(widget=ProseEditorWidget)
        self.assertIsInstance(field.widget, ProseEditorWidget)

        field = ProseEditorFormField(widget=ProseEditorWidget())
        self.assertIsInstance(field.widget, ProseEditorWidget)

    def test_cleaning(self):
        class Form(forms.Form):
            content = ProseEditorFormField(sanitize=lambda html: "Hello")

        form = Form({"content": "World"})
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data, {"content": "Hello"})


class FormWithProseEditorField(forms.Form):
    """A form using ProseEditorFormField with different widget configurations."""

    # Default widget (None)
    content_default = ProseEditorFormField()

    # Non-ProseEditorWidget class
    content_custom_class = ProseEditorFormField(widget=CustomWidget)

    # Non-ProseEditorWidget instance
    content_custom_instance = ProseEditorFormField(widget=CustomWidget())

    # AdminTextareaWidget class
    content_admin_class = ProseEditorFormField(widget=widgets.AdminTextareaWidget)

    # AdminTextareaWidget instance
    content_admin_instance = ProseEditorFormField(widget=widgets.AdminTextareaWidget())


class FormRenderingTest(TestCase):
    def test_form_rendering(self):
        """Test that forms with different widget configurations render correctly."""
        form = FormWithProseEditorField()

        # The form should render all fields with appropriate ProseEditor widgets
        html = form.as_p()

        # Count the number of data-django-prose-editor attributes
        # All fields should use the data attribute with default preset
        self.assertEqual(html.count("data-django-prose-editor-default"), 5)

        # All fields should use ProseEditor widgets (either standard or admin)
        total_prose_editors = len(
            [
                field
                for field in form.fields.values()
                if isinstance(field.widget, ProseEditorWidget | AdminProseEditorWidget)
            ]
        )
        self.assertEqual(
            total_prose_editors, 5
        )  # All 5 fields should use ProseEditor widgets
