from datetime import timedelta
from pathlib import Path
import subprocess
import sys

from jose import jwt
import pytest

from app.core.config import settings
from app.core.security import (
    MAX_BCRYPT_PASSWORD_BYTES,
    create_access_token,
    decode_token,
    hash_password,
    validate_bcrypt_password,
    verify_password,
)


def test_decode_token_valid():
    token = create_access_token({"sub": "testuser"})
    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == "testuser"

def test_decode_token_expired():
    # Create a token that expired 1 minute ago
    token = create_access_token(
        data={"sub": "testuser"},
        expires_delta=timedelta(minutes=-1)
    )
    # decode_token should catch JWTError (specifically ExpiredSignatureError) and return None
    payload = decode_token(token)
    assert payload is None

def test_decode_token_invalid_signature():
    # Create a valid token but sign it with a different secret
    wrong_secret = "this_is_not_the_real_secret"
    to_encode = {"sub": "testuser"}
    encoded_jwt = jwt.encode(to_encode, wrong_secret, algorithm=settings.ALGORITHM)
    
    # decode_token should fail verification and return None
    payload = decode_token(encoded_jwt)
    assert payload is None

def test_decode_token_malformed_string():
    # decode_token should handle arbitrary malformed strings gracefully
    assert decode_token("not.a.real.jwt.token") is None
    assert decode_token("") is None


def test_hash_and_verify_password():
    plain = "sample-check-phrase-123"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True
    assert verify_password("incorrect-phrase-456", hashed) is False


def test_password_length_limit():
    valid_max = "a" * MAX_BCRYPT_PASSWORD_BYTES
    assert validate_bcrypt_password(valid_max) == valid_max

    too_long = "a" * (MAX_BCRYPT_PASSWORD_BYTES + 1)
    with pytest.raises(ValueError, match="Password must be at most 72 UTF-8 bytes"):
        validate_bcrypt_password(too_long)

    with pytest.raises(ValueError, match="Password must be at most 72 UTF-8 bytes"):
        hash_password(too_long)

    # verify_password should catch ValueError and return False without raising
    assert verify_password(too_long, "$2b$04$dummyhash") is False


def test_test_suite_uses_fast_bcrypt():
    hashed = hash_password("test")
    assert hashed.startswith("$2b$04$")


def test_production_hash_uses_cost_12():
    backend_dir = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        [sys.executable, "-c", "from app.core.security import hash_password; print(hash_password('x'))"],
        capture_output=True,
        text=True,
        cwd=backend_dir,
    )
    assert result.returncode == 0, result.stderr
    hashed = result.stdout.strip()
    assert hashed.startswith("$2b$12$")
