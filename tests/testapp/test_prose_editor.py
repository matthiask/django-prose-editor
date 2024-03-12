from django import test
from django.db import models
from django.test.utils import isolate_apps

from django_prose_editor.sanitized import SanitizedProseEditorField


class Test(test.TestCase):
    @isolate_apps()
    def test_field(self):
        class Model(models.Model):
            description = SanitizedProseEditorField()

            def __str__(self):
                return self.description

        m = Model(description="<style>h1{color:red}</style><h1>Hello</h1>")
        m.full_clean()
        self.assertEqual(m.description, "<h1>Hello</h1>")
