from copy import deepcopy

from django_prose_editor.fields import ProseEditorField, _actually_empty


def _nh3_sanitizer():
    import nh3  # noqa: PLC0415

    attributes = deepcopy(nh3.ALLOWED_ATTRIBUTES)
    attributes["a"].add("target")
    attributes["ol"] |= {"start", "type"}

    cleaner = nh3.Cleaner(attributes=attributes)
    return lambda x: _actually_empty(cleaner.clean(x))


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        if "sanitize" not in kwargs:
            kwargs["sanitize"] = _nh3_sanitizer()
        super().__init__(*args, **kwargs)
