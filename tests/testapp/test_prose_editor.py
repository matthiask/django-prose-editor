import warnings

from django import test
from django.contrib.auth.models import User
from django.test import Client

from django_prose_editor.fields import ProseEditorField
from testapp.models import ProseEditorModel, SanitizedProseEditorModel


class Test(test.TestCase):
    def test_standard_field(self):
        m = ProseEditorModel(description="<p></p>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = ProseEditorModel(description="<h1></h1>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = ProseEditorModel(description="<p>hello</p>")
        m.full_clean()
        self.assertEqual(m.description, "<p>hello</p>")

    def test_sanitized_field(self):
        m = SanitizedProseEditorModel(
            description="<style>h1{color:red}</style><h1>Hello</h1>"
        )
        m.full_clean()
        self.assertEqual(m.description, "<h1>Hello</h1>")

        m = SanitizedProseEditorModel(description="<p></p>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = SanitizedProseEditorModel(description="<h1></h1>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = SanitizedProseEditorModel(description="<p>hello</p>")
        m.full_clean()
        self.assertEqual(m.description, "<p>hello</p>")

    def test_admin(self):
        client = Client()
        client.force_login(
            User.objects.create_superuser("admin", "admin@example.com", "password")
        )

        response = client.get("/admin/testapp/proseeditormodel/add/")
        # print(response, response.content.decode("utf-8"))
        self.assertContains(
            response, 'href="/static/django_prose_editor/overrides.css"'
        )

    def test_config_deprecation_warning(self):
        """Test that using the 'config' parameter raises a deprecation warning."""
        with warnings.catch_warnings(record=True) as w:
            # Enable deprecation warnings
            warnings.simplefilter("always", DeprecationWarning)

            # Creating a field with 'config' parameter should raise a warning
            ProseEditorField(config={"types": ["Bold", "Italic"]})

            # Check that a warning was raised
            self.assertEqual(len(w), 1)
            self.assertTrue(issubclass(w[0].category, DeprecationWarning))
            self.assertIn(
                "'config' parameter with ProseEditorField is deprecated",
                str(w[0].message),
            )
            self.assertIn("use the 'extensions' parameter instead", str(w[0].message))
