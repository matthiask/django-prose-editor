from django.contrib import admin

from testapp import models


admin.register(models.ProseEditorModel)
admin.register(models.SanitizedProseEditorModel)
