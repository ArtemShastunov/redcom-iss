from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .config import settings

_ph = PasswordHasher()
_serializer = URLSafeTimedSerializer(settings.secret_key, salt="iss-session")


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(password_hash: str, plain: str) -> bool:
    try:
        _ph.verify(password_hash, plain)
        return True
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def make_session_token(user_id: int) -> str:
    return _serializer.dumps({"uid": user_id})


def read_session_token(token: str) -> int | None:
    try:
        data = _serializer.loads(token, max_age=settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
    uid = data.get("uid")
    return uid if isinstance(uid, int) else None


# ---------- Транслитерация для логинов ----------

_TRANSLIT_MAP = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def make_login_from_full_name(full_name: str) -> str:
    """'Сафронов Максим' -> 'safronov'. Только латиница, нижний регистр."""
    if not full_name:
        return "user"
    surname = full_name.strip().split()[0].lower()
    result = []
    for ch in surname:
        if ch.isascii() and (ch.isalnum() or ch == "_"):
            result.append(ch)
        elif ch in _TRANSLIT_MAP:
            result.append(_TRANSLIT_MAP[ch])
    login = "".join(result)
    return login[:60] or "user"
