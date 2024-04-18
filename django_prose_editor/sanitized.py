from django_prose_editor.fields import ProseEditorField, _actually_empty


def _nh3_sanitizer():
    from nh3 import clean

    return lambda x: _actually_empty(clean(x))


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        if "sanitize" not in kwargs:
            kwargs["sanitize"] = _nh3_sanitizer()
        super().__init__(*args, **kwargs)
