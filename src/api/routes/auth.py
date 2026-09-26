from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
import bcrypt
from jose import jwt

from src.api.database import engine


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


# ---------------------------------
# JWT CONFIG
# ---------------------------------

SECRET_KEY = "trustupi-admin-secret-key-change-this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ---------------------------------
# SIGNUP SCHEMA
# ---------------------------------

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str


# ---------------------------------
# LOGIN SCHEMA
# ---------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------------------------------
# SIGNUP
# ---------------------------------

@router.post("/signup")
def admin_signup(data: SignupRequest):

    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )

    with engine.begin() as connection:

        existing_admin = connection.execute(
            text("""
                SELECT id
                FROM admin_users
                WHERE email = :email
            """),
            {
                "email": data.email
            }
        ).fetchone()

        if existing_admin:
            raise HTTPException(
                status_code=400,
                detail="Admin account with this email already exists"
            )

        password_hash = bcrypt.hashpw(
            data.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        result = connection.execute(
            text("""
                INSERT INTO admin_users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    designation,
                    is_active
                )
                VALUES
                (
                    :name,
                    :email,
                    :password_hash,
                    'Admin',
                    'Fraud Analyst',
                    TRUE
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    designation,
                    is_active
            """),
            {
                "name": data.name,
                "email": data.email,
                "password_hash": password_hash
            }
        )

        admin = result.fetchone()

    return {
        "message": "Admin account created successfully",
        "admin": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "role": admin.role,
            "designation": admin.designation,
            "is_active": admin.is_active
        }
    }


# ---------------------------------
# LOGIN
# ---------------------------------

@router.post("/login")
def admin_login(data: LoginRequest):

    with engine.begin() as connection:

        admin = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    email,
                    password_hash,
                    role,
                    designation,
                    is_active
                FROM admin_users
                WHERE email = :email
            """),
            {
                "email": data.email
            }
        ).fetchone()

        # Email not found
        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Account disabled
        if not admin.is_active:
            raise HTTPException(
                status_code=403,
                detail="Admin account is inactive"
            )

        # Verify password
        password_valid = bcrypt.checkpw(
            data.password.encode("utf-8"),
            admin.password_hash.encode("utf-8")
        )

        if not password_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Update last login
        connection.execute(
            text("""
                UPDATE admin_users
                SET last_login = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """),
            {
                "id": admin.id
            }
        )

    # Create JWT
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token_payload = {
        "sub": str(admin.id),
        "email": admin.email,
        "role": admin.role,
        "exp": expire
    }

    access_token = jwt.encode(
        token_payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "role": admin.role,
            "designation": admin.designation,
            "is_active": admin.is_active
        }
    }