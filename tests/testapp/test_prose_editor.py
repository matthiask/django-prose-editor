from django import test
from django.db import models
from django.test.utils import isolate_apps

from django_prose_editor.fields import ProseEditorField


class Test(test.TestCase):
    @isolate_apps()
    def test_field(self):
        class Model(models.Model):
            description = ProseEditorField()

            def __str__(self):
                return self.description
