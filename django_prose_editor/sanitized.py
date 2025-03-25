from django_prose_editor.fields import ProseEditorField, _actually_empty


def _nh3_sanitizer():
    from copy import deepcopy

    import nh3

    attributes = deepcopy(nh3.ALLOWED_ATTRIBUTES)
    attributes["a"].add("target")
    attributes["ol"] |= {"start", "type"}

    return lambda x: _actually_empty(nh3.clean(x, attributes=attributes))


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        if "sanitize" not in kwargs:
            kwargs["sanitize"] = _nh3_sanitizer()
        super().__init__(*args, **kwargs)
