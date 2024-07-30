from django import test
from django.test.utils import isolate_apps

from testapp.models import ProseEditorModel, SanitizedProseEditorModel


class Test(test.TestCase):
    @isolate_apps()
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

    @isolate_apps()
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
