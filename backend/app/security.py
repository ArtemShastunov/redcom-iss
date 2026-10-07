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
