from django.core.checks import Error, Warning
from django.test import SimpleTestCase, override_settings

from django_prose_editor.checks import (
    check_extensions_parameter,
    check_js_preset_configuration,
)


class ChecksTests(SimpleTestCase):
    @override_settings(DJANGO_PROSE_EDITOR_PRESETS={})
    def test_no_default_preset_override(self):
        """Test that no errors are returned when 'default' preset is not overridden."""
        errors = check_js_preset_configuration(None)
        self.assertEqual(errors, [])

    @override_settings(DJANGO_PROSE_EDITOR_PRESETS={"default": []})
    def test_default_preset_override(self):
        """Test that an error is returned when 'default' preset is overridden."""
        errors = check_js_preset_configuration(None)
        self.assertEqual(len(errors), 1)
        self.assertIsInstance(errors[0], Error)
        self.assertEqual(
            errors[0].msg,
            'Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
        )
        self.assertEqual(errors[0].id, "django_prose_editor.E001")

    def test_config_deprecation_system_check(self):
        """Test that using the 'config' parameter is caught by system checks."""
        # Run the check function
        warnings = check_extensions_parameter([])

        # We expect warnings for each model that uses legacy config
        expected_models = [
            "ProseEditorModel",
            "SanitizedProseEditorModel",
            "TableProseEditorModel",
        ]

        # Check that we have at least the expected number of warnings
        self.assertTrue(
            len(warnings) >= len(expected_models),
            f"Expected at least {len(expected_models)} warnings, got {len(warnings)}",
        )

        # For each expected model, make sure there's a corresponding warning
        for model_name in expected_models:
            model_warnings = [w for w in warnings if w.obj and model_name in w.obj]
            self.assertTrue(
                len(model_warnings) > 0,
                f"No deprecation warning found for {model_name}",
            )

            # Verify the warning properties for one of them
            if model_name == "TableProseEditorModel":
                warning = model_warnings[0]
                self.assertTrue(isinstance(warning, Warning))
                self.assertEqual(warning.id, "django_prose_editor.W001")
                self.assertIn("legacy configuration format", warning.msg)
                self.assertIn("Add the 'extensions' parameter", warning.msg)
                self.assertIn("extensions", warning.hint)
