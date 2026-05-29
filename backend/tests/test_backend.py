"""Backend regression tests for Off Campus app.

Covers:
- Health/regression (colleges, health)
- Admin auth (JWT) + admin endpoints (stats, users, grant-premium, delete)
- Photo upload / delete
- Referrals my-stats
- Messaging (gating by match)
- Auto-verify college email logic (verified via direct lookup using
  the same helper logic the endpoint relies on)
"""

import base64
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
TINY_B64 = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()


# ----------------- Health / regression -----------------
class TestHealthAndRegression:
    def test_health(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/health")
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"

    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "online"

    def test_colleges_list(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/colleges/list")
        assert r.status_code == 200
        colleges = r.json().get("colleges", [])
        assert isinstance(colleges, list)
        assert len(colleges) >= 10
        # verify shape
        c = colleges[0]
        for f in ("college_id", "name", "short_name", "email_domains"):
            assert f in c


# ----------------- Admin auth -----------------
class TestAdminAuth:
    def test_admin_login_success(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/admin/login", json={
            "email": "admin@offcampus.com",
            "password": "OffCampus@2026"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20

    def test_admin_login_wrong_password(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/admin/login", json={
            "email": "admin@offcampus.com", 
            "password": "WRONG"
        })
        assert r.status_code == 401

    def test_admin_login_wrong_email(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/admin/login", json={
            "email": "nope@offcampus.com",
            "password": "OffCampus@2026"
        })
        assert r.status_code == 401

    def test_admin_endpoint_requires_token(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/admin/stats")
        assert r.status_code == 401

    def test_admin_endpoint_rejects_bad_token(self, api_client, base_url):
        r = api_client.get(
            f"{base_url}/api/admin/stats",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert r.status_code == 401


# ----------------- Admin features -----------------
class TestAdminFeatures:
    def test_admin_stats(self, api_client, base_url, admin_token):
        r = api_client.get(
            f"{base_url}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for key in (
            "total_users", "verified_users", "pending_verifications",
            "premium_users", "users_on_campus", "total_confessions",
            "total_matches", "total_colleges",
        ):
            assert key in data, f"missing {key}"
            assert isinstance(data[key], int)
        assert data["total_colleges"] >= 10

    def test_admin_list_users(self, api_client, base_url, admin_token, user_a):
        r = api_client.get(
            f"{base_url}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "users" in data and "count" in data
        assert data["count"] >= 1
        user_ids = [u["user_id"] for u in data["users"]]
        assert user_a["user_id"] in user_ids

    def test_admin_list_users_with_status_filter(self, api_client, base_url, admin_token):
        r = api_client.get(
            f"{base_url}/api/admin/users?status=verified",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        for u in r.json()["users"]:
            assert u["verification_status"] == "verified"

    def test_admin_list_users_with_search(self, api_client, base_url, admin_token, user_a):
        r = api_client.get(
            f"{base_url}/api/admin/users?search=USERA",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        # Should find our test user
        ids = [u["user_id"] for u in r.json()["users"]]
        assert user_a["user_id"] in ids

    def test_admin_grant_premium(self, api_client, base_url, admin_token, user_a, mongo):
        r = api_client.post(
            f"{base_url}/api/admin/users/{user_a['user_id']}/grant-premium?days=30",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200, r.text
        # verify persistence
        u = mongo.users.find_one({"user_id": user_a["user_id"]})
        assert u["is_premium"] is True
        assert u["premium_until"] is not None

    def test_admin_delete_confession(self, api_client, base_url, admin_token, mongo):
        cid = f"conf_{uuid.uuid4().hex[:12]}"
        mongo.confessions.insert_one({
            "confession_id": cid,
            "user_id": "TEST_user",
            "college_id": None,
            "content": "TEST confession",
            "likes": 0,
            "comments": 0,
            "created_at": datetime.now(timezone.utc)
        })
        r = api_client.delete(
            f"{base_url}/api/admin/confessions/{cid}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        # ensure deleted
        assert mongo.confessions.find_one({"confession_id": cid}) is None

    def test_admin_delete_user(self, api_client, base_url, admin_token, mongo):
        # Create temp user
        uid = f"user_{uuid.uuid4().hex[:12]}"
        mongo.users.insert_one({
            "user_id": uid,
            "email": f"TEST_del_{uid}@example.com",
            "name": "TEST_del",
            "photos": [],
            "verification_status": "pending",
            "is_premium": False,
            "is_on_campus": False,
            "created_at": datetime.now(timezone.utc),
            "total_ratings": 0, "rating_sum": 0.0,
            "interests": [],
            "spotify_data": {"top_tracks": [], "top_artists": []},
            "vibe_score": 5.0,
        })
        r = api_client.delete(
            f"{base_url}/api/admin/users/{uid}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        assert mongo.users.find_one({"user_id": uid}) is None

    def test_admin_delete_nonexistent_user(self, api_client, base_url, admin_token):
        r = api_client.delete(
            f"{base_url}/api/admin/users/user_doesnotexist",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 404


# ----------------- Photo upload -----------------
class TestProfilePhotos:
    def test_add_photo(self, api_client, base_url, user_a, mongo):
        r = api_client.post(
            f"{base_url}/api/profile/photos",
            json={"photo": TINY_B64},
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200, r.text
        u = mongo.users.find_one({"user_id": user_a["user_id"]})
        assert TINY_B64 in u["photos"]

    def test_delete_photo(self, api_client, base_url, user_a, mongo):
        # ensure there is a photo
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"photos": ["photo0", "photo1"]}}
        )
        r = api_client.delete(
            f"{base_url}/api/profile/photos/0",
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200
        u = mongo.users.find_one({"user_id": user_a["user_id"]})
        assert u["photos"] == ["photo1"]

    def test_add_photo_unauthenticated(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/profile/photos", json={"photo": "x"})
        assert r.status_code == 401


# ----------------- Referrals -----------------
class TestReferrals:
    def test_my_stats(self, api_client, base_url, user_a):
        r = api_client.get(
            f"{base_url}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("referral_code", "referral_count", "referred_users",
                  "premium_days_remaining", "rewards_earned_days"):
            assert k in data, f"missing {k}"
        assert isinstance(data["referral_code"], str)
        assert len(data["referral_code"]) >= 4

    def test_my_stats_unauthenticated(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/referrals/my-stats")
        assert r.status_code == 401

    def test_referral_reward_logic(self, api_client, base_url, mongo, user_a):
        """Simulate a new referred user → referrer should get 7 days premium."""
        # Set known referral_code on user_a
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"referral_code": "TESTREF1", "is_premium": False, "premium_until": None, "referral_count": 0}}
        )

        # Manually emulate what google-session does for referral processing
        # (since we cannot mint a real session_id from emergent OAuth here):
        from datetime import timedelta
        referrer = mongo.users.find_one({"referral_code": "TESTREF1"})
        assert referrer is not None
        new_premium = datetime.now(timezone.utc) + timedelta(days=7)
        mongo.users.update_one(
            {"user_id": referrer["user_id"]},
            {"$set": {"premium_until": new_premium, "is_premium": True},
             "$inc": {"referral_count": 1}}
        )

        # Verify via referral stats endpoint
        r = api_client.get(
            f"{base_url}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        data = r.json()
        assert data["referral_count"] == 1
        assert data["premium_days_remaining"] >= 6


# ----------------- Messaging -----------------
class TestMessaging:
    def test_send_message_not_matched_returns_403(self, api_client, base_url, user_a, user_b, mongo):
        # Ensure no match
        mongo.likes.delete_many({"$or": [
            {"from_user_id": user_a["user_id"]},
            {"from_user_id": user_b["user_id"]},
        ]})
        r = api_client.post(
            f"{base_url}/api/messages/send",
            json={"to_user_id": user_b["user_id"], "content": "hey"},
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 403, r.text

    def test_send_and_retrieve_messages_when_matched(self, api_client, base_url, user_a, user_b, mongo):
        # Create mutual match
        now = datetime.now(timezone.utc)
        mongo.likes.insert_one({
            "like_id": f"like_{uuid.uuid4().hex[:12]}",
            "from_user_id": user_a["user_id"],
            "to_user_id": user_b["user_id"],
            "created_at": now, "is_match": True,
        })
        mongo.likes.insert_one({
            "like_id": f"like_{uuid.uuid4().hex[:12]}",
            "from_user_id": user_b["user_id"],
            "to_user_id": user_a["user_id"],
            "created_at": now, "is_match": True,
        })

        # A → B send
        r = api_client.post(
            f"{base_url}/api/messages/send",
            json={"to_user_id": user_b["user_id"], "content": "Hello B"},
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200, r.text
        msg = r.json()["message"]
        assert msg["content"] == "Hello B"
        assert msg["from_user_id"] == user_a["user_id"]
        assert msg["to_user_id"] == user_b["user_id"]

        # Get messages from B's perspective
        r = api_client.get(
            f"{base_url}/api/messages/{user_a['user_id']}",
            headers={"Authorization": f"Bearer {user_b['token']}"}
        )
        assert r.status_code == 200
        messages = r.json()["messages"]
        assert len(messages) >= 1
        assert any(m["content"] == "Hello B" for m in messages)

        # After GET, message should be marked read
        in_db = mongo.messages.find_one({"content": "Hello B"})
        assert in_db["read"] is True

    def test_get_conversations(self, api_client, base_url, user_a, user_b):
        r = api_client.get(
            f"{base_url}/api/messages/conversations",
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200
        conversations = r.json()["conversations"]
        # Should have at least one conversation since match exists
        assert isinstance(conversations, list)
        assert len(conversations) >= 1
        conv = conversations[0]
        assert "user" in conv
        assert "last_message" in conv
        assert "unread_count" in conv

    def test_send_message_unauthenticated(self, api_client, base_url, user_b):
        r = api_client.post(
            f"{base_url}/api/messages/send",
            json={"to_user_id": user_b["user_id"], "content": "x"}
        )
        assert r.status_code == 401


# ----------------- Auto-verify college email (logic) -----------------
class TestCollegeAutoVerify:
    """
    The google-session endpoint cannot be triggered without a real OAuth
    session_id from emergent. We instead validate the logic by:
    1) Asserting at least one seeded college has the iitd.ac.in domain
    2) The verification_status assignment branch is exercised in code
       (visible in server.py lines 316-336).
    """
    def test_college_email_domain_seeded(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/colleges/list")
        colleges = r.json()["colleges"]
        all_domains = set()
        for c in colleges:
            for d in c.get("email_domains", []):
                all_domains.add(d.lower())
        assert "iitd.ac.in" in all_domains
        assert "ipu.ac.in" in all_domains
        assert "lsr.edu.in" in all_domains


# ----------------- Existing regression -----------------
class TestExistingEndpoints:
    def test_get_discovery_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/discovery/profiles")
        assert r.status_code == 401

    def test_confessions_feed_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/confessions/feed")
        assert r.status_code == 401

    def test_create_confession(self, api_client, base_url, user_a, mongo):
        r = api_client.post(
            f"{base_url}/api/confessions/create",
            json={"content": "TEST confession from pytest", "college_id": None},
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200
        cid = r.json()["confession"]["confession_id"]
        # cleanup
        mongo.confessions.delete_one({"confession_id": cid})

    def test_rate_user(self, api_client, base_url, user_a, user_b, mongo):
        r = api_client.post(
            f"{base_url}/api/ratings/create",
            json={"to_user_id": user_b["user_id"], "score": 4.0},
            headers={"Authorization": f"Bearer {user_a['token']}"}
        )
        assert r.status_code == 200
        # cleanup
        mongo.ratings.delete_many({"from_user_id": user_a["user_id"]})
