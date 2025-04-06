from django.core.checks import Error
from django.test import SimpleTestCase, override_settings

from django_prose_editor.checks import check_js_implementation_configuration


class ChecksTests(SimpleTestCase):
    @override_settings(DJANGO_PROSE_EDITOR_PRESETS={})
    def test_no_default_preset_override(self):
        """Test that no errors are returned when 'default' preset is not overridden."""
        errors = check_js_implementation_configuration(None)
        self.assertEqual(errors, [])

    @override_settings(DJANGO_PROSE_EDITOR_PRESETS={"default": []})
    def test_default_preset_override(self):
        """Test that an error is returned when 'default' preset is overridden."""
        errors = check_js_implementation_configuration(None)
        self.assertEqual(len(errors), 1)
        self.assertIsInstance(errors[0], Error)
        self.assertEqual(
            errors[0].msg,
            'Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
        )
        self.assertEqual(errors[0].id, "django_prose_editor.E001")
