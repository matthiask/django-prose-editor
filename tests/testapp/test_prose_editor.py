from django import test
from django.db import models
from django.test.utils import isolate_apps

from django_prose_editor.fields import ProseEditorField
from django_prose_editor.sanitized import SanitizedProseEditorField


class Test(test.TestCase):
    @isolate_apps()
    def test_standard_field(self):
        class Model(models.Model):
            description = ProseEditorField()

            def __str__(self):
                return self.description

        m = Model(description="<p></p>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = Model(description="<h1></h1>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = Model(description="<p>hello</p>")
        m.full_clean()
        self.assertEqual(m.description, "<p>hello</p>")

    @isolate_apps()
    def test_sanitized_field(self):
        class Model(models.Model):
            description = SanitizedProseEditorField()

            def __str__(self):
                return self.description

        m = Model(description="<style>h1{color:red}</style><h1>Hello</h1>")
        m.full_clean()
        self.assertEqual(m.description, "<h1>Hello</h1>")

        m = Model(description="<p></p>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = Model(description="<h1></h1>")
        m.full_clean()
        self.assertEqual(m.description, "")

        m = Model(description="<p>hello</p>")
        m.full_clean()
        self.assertEqual(m.description, "<p>hello</p>")
