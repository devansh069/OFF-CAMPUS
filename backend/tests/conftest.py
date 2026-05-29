import os
import sys
import uuid
import requests
import pytest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load backend env
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

# Base URL (public)
FRONTEND_ENV = ROOT.parent / "frontend" / ".env"
load_dotenv(FRONTEND_ENV)

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


def _insert_test_user(mongo, name_prefix="TEST"):
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": f"TEST_{user_id}@example.com",
        "name": f"{name_prefix}_{user_id[-4:]}",
        "age": 21,
        "gender": "male",
        "college_id": None,
        "year": "2nd Year",
        "course": "CS",
        "bio": "test",
        "interests": [],
        "looking_for": "all",
        "photos": [],
        "vibe_score": 5.0,
        "spotify_data": {"top_tracks": [], "top_artists": []},
        "is_premium": False,
        "verification_status": "verified",
        "picture": None,
        "is_on_campus": False,
        "last_location_update": None,
        "created_at": datetime.now(timezone.utc),
        "total_ratings": 0,
        "rating_sum": 0.0,
        "referral_code": f"TEST{user_id[-4:].upper()}",
        "referred_by": None,
        "referral_count": 0,
        "premium_until": None,
    }
    mongo.users.insert_one(user)
    token = f"sess_{uuid.uuid4().hex}"
    mongo.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    return user_id, token


@pytest.fixture(scope="session")
def user_a(mongo):
    uid, tok = _insert_test_user(mongo, "USERA")
    yield {"user_id": uid, "token": tok}
    # cleanup
    mongo.users.delete_one({"user_id": uid})
    mongo.user_sessions.delete_many({"user_id": uid})
    mongo.likes.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})
    mongo.messages.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})


@pytest.fixture(scope="session")
def user_b(mongo):
    uid, tok = _insert_test_user(mongo, "USERB")
    yield {"user_id": uid, "token": tok}
    mongo.users.delete_one({"user_id": uid})
    mongo.user_sessions.delete_many({"user_id": uid})
    mongo.likes.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})
    mongo.messages.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})


@pytest.fixture(scope="session")
def admin_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@offcampus.com",
        "password": "OffCampus@2026"
    })
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]
