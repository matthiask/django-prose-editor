from django.core.checks import Error, Warning
from django.test import SimpleTestCase, override_settings

from django_prose_editor.checks import (
    check_extensions_parameter,
    check_js_preset_configuration,
    check_sanitization_enabled,
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
                # self.assertIn("extensions", warning.hint)

    def test_sanitization_check(self):
        """Test that all ProseEditorField instances without sanitization are caught."""
        # Run the check function on existing models
        warnings = check_sanitization_enabled([])

        # We expect warnings for ProseEditorModel since it doesn't have sanitization
        # but not for SanitizedProseEditorModel (has sanitization) or ConfigurableProseEditorModel (has sanitize=True)
        warning_objects = [w.obj for w in warnings]

        # Check expected warnings
        expected_warnings = any("ProseEditorModel.description" in obj for obj in warning_objects)
        self.assertTrue(expected_warnings, "No warning for ProseEditorModel without sanitization")

        # Check unexpected warnings
        self.assertFalse(
            any("SanitizedProseEditorModel" in obj for obj in warning_objects),
            "Unexpected warning for SanitizedProseEditorModel which should have sanitization"
        )
        self.assertFalse(
            any("ConfigurableProseEditorModel" in obj for obj in warning_objects),
            "Unexpected warning for ConfigurableProseEditorModel which has sanitize=True"
        )

        # Test with different field configurations using a synthetic model
        from django.db import models
        from django_prose_editor.fields import ProseEditorField

        class TestModel(models.Model):
            class Meta:
                app_label = "test_app_never_installed"

            # Fields with different configurations, all without sanitization
            with_extensions = ProseEditorField(
                config={"extensions": {"Bold": True}},
                sanitize=False
            )

            legacy_config = ProseEditorField(
                config={"types": ["Bold"]},
                sanitize=False
            )

            no_config = ProseEditorField(
                sanitize=False
            )

        # Manually add our test model to the models to check
        warnings = check_sanitization_enabled([type("AppConfig", (), {"get_models": lambda: [TestModel]})])

        # Check that we got warnings for all three fields
        self.assertEqual(len(warnings), 3)

        # Check extension field warning
        extension_warnings = [w for w in warnings if "test_app_never_installed.TestModel.with_extensions" in w.obj]
        self.assertEqual(len(extension_warnings), 1)
        self.assertIn("using extensions without sanitization", extension_warnings[0].msg)
        self.assertIn("matches your configured extensions", extension_warnings[0].hint)

        # Check legacy config field warning
        legacy_warnings = [w for w in warnings if "test_app_never_installed.TestModel.legacy_config" in w.obj]
        self.assertEqual(len(legacy_warnings), 1)
        self.assertIn("doesn't have sanitization enabled", legacy_warnings[0].msg)
        self.assertIn("extensions mechanism with sanitize=True", legacy_warnings[0].hint)

        # Check no config field warning
        no_config_warnings = [w for w in warnings if "test_app_never_installed.TestModel.no_config" in w.obj]
        self.assertEqual(len(no_config_warnings), 1)
        self.assertIn("doesn't have sanitization enabled", no_config_warnings[0].msg)
        self.assertIn("extensions mechanism with sanitize=True", no_config_warnings[0].hint)
