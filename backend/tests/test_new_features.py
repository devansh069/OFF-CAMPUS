"""Tests for NEW features: Premium (Stripe), Events/RSVP, Stories, Leaderboard.

Plus a quick regression on /auth/me + conversations + colleges list.
"""

import base64
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
TINY_B64 = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()


# ============= PREMIUM / STRIPE =============
class TestPremiumCheckout:
    def test_checkout_requires_auth(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/premium/checkout",
            json={"success_url": "https://example.com/s", "cancel_url": "https://example.com/c"},
        )
        assert r.status_code == 401

    def test_checkout_creates_stripe_session_inr_9900(self, api_client, base_url, user_a, mongo):
        r = api_client.post(
            f"{base_url}/api/premium/checkout",
            json={
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            },
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert "stripe.com" in data["checkout_url"]
        # Verify payment session stored with INR 9900
        ps = mongo.payment_sessions.find_one({"session_id": data["session_id"]})
        assert ps is not None
        assert ps["amount"] == 9900
        assert ps["currency"] == "inr"
        assert ps["status"] == "pending"
        assert ps["user_id"] == user_a["user_id"]
        # cleanup
        mongo.payment_sessions.delete_one({"session_id": data["session_id"]})

    def test_premium_status_pending(self, api_client, base_url, user_a, mongo):
        # Create checkout first
        r = api_client.post(
            f"{base_url}/api/premium/checkout",
            json={"success_url": "https://example.com/s", "cancel_url": "https://example.com/c"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        sid = r.json()["session_id"]
        # Status check
        r2 = api_client.get(
            f"{base_url}/api/premium/status/{sid}",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "status" in data
        assert "is_premium" in data
        # Fresh session => not yet paid
        assert data["is_premium"] is False
        # cleanup
        mongo.payment_sessions.delete_one({"session_id": sid})


# ============= EVENTS =============
class TestEvents:
    def test_events_feed_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/events/feed")
        assert r.status_code == 401

    def test_create_event(self, api_client, base_url, user_a, mongo):
        # Ensure user_a has a college_id
        college = mongo.colleges.find_one({})
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"college_id": college["college_id"]}},
        )
        payload = {
            "title": "TEST Fest 2026",
            "description": "test description",
            "location": "Main Lawn",
            "date": "2026-03-15T18:00:00Z",
            "category": "fest",
        }
        r = api_client.post(
            f"{base_url}/api/events/create",
            json=payload,
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        evt = r.json()["event"]
        assert evt["title"] == "TEST Fest 2026"
        assert evt["host_user_id"] == user_a["user_id"]
        assert evt["attendee_count"] == 0
        assert "event_id" in evt
        # verify persistence
        in_db = mongo.events.find_one({"event_id": evt["event_id"]})
        assert in_db is not None
        # cleanup
        mongo.events.delete_one({"event_id": evt["event_id"]})

    def test_events_feed_returns_seeded_events(self, api_client, base_url, user_a, mongo):
        # Make user_a premium so they see all events regardless of college
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"is_premium": True}},
        )
        r = api_client.get(
            f"{base_url}/api/events/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        events = r.json()["events"]
        assert isinstance(events, list)
        # At least the 5 seeded events
        assert len(events) >= 1, "Expected at least seeded events. Got 0."
        # Check shape
        if events:
            e = events[0]
            for f in ("event_id", "title", "location", "date", "attendee_count", "is_attending"):
                assert f in e, f"missing {f}"

    def test_events_feed_premium_gating(self, api_client, base_url, user_a, mongo):
        """Non-premium users see only own college events; premium sees all."""
        # Insert an event for a DIFFERENT college
        all_colleges = list(mongo.colleges.find({}).limit(2))
        if len(all_colleges) < 2:
            pytest.skip("need 2 colleges")
        col_a, col_b = all_colleges[0], all_colleges[1]
        # user_a in col_a
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"college_id": col_a["college_id"], "is_premium": False}},
        )
        # Event in col_b
        evid = f"event_{uuid.uuid4().hex[:12]}"
        mongo.events.insert_one({
            "event_id": evid,
            "title": "TEST_OtherCollegeEvent",
            "description": "x",
            "college_id": col_b["college_id"],
            "location": "x",
            "date": "2026-04-01T00:00:00Z",
            "cover_image": None,
            "category": "fest",
            "host_user_id": "x",
            "host_name": "x",
            "attendees": [],
            "attendee_count": 0,
            "created_at": datetime.now(timezone.utc),
        })
        # Non-premium: should NOT see the other-college event
        r = api_client.get(
            f"{base_url}/api/events/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        non_prem_ids = [e["event_id"] for e in r.json()["events"]]
        assert evid not in non_prem_ids, "Non-premium user saw event from another college"
        # Make premium: should now SEE it
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"is_premium": True}},
        )
        r = api_client.get(
            f"{base_url}/api/events/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        prem_ids = [e["event_id"] for e in r.json()["events"]]
        assert evid in prem_ids, "Premium user did not see the event from another college"
        # cleanup
        mongo.events.delete_one({"event_id": evid})

    def test_rsvp_toggle(self, api_client, base_url, user_a, mongo):
        # Create an event
        evid = f"event_{uuid.uuid4().hex[:12]}"
        mongo.events.insert_one({
            "event_id": evid,
            "title": "TEST RSVP",
            "description": "x",
            "college_id": None,
            "location": "x",
            "date": "2026-05-01T00:00:00Z",
            "cover_image": None,
            "category": "fest",
            "host_user_id": "h",
            "host_name": "h",
            "attendees": [],
            "attendee_count": 0,
            "created_at": datetime.now(timezone.utc),
        })
        # RSVP on
        r = api_client.post(
            f"{base_url}/api/events/{evid}/rsvp",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["attending"] is True
        assert d["attendee_count"] == 1
        # Verify in DB
        in_db = mongo.events.find_one({"event_id": evid})
        assert user_a["user_id"] in in_db["attendees"]

        # RSVP toggle off
        r2 = api_client.post(
            f"{base_url}/api/events/{evid}/rsvp",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        d2 = r2.json()
        assert d2["attending"] is False
        assert d2["attendee_count"] == 0
        # cleanup
        mongo.events.delete_one({"event_id": evid})

    def test_rsvp_event_not_found(self, api_client, base_url, user_a):
        r = api_client.post(
            f"{base_url}/api/events/event_nonexistent/rsvp",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 404

    def test_event_attendees(self, api_client, base_url, user_a, user_b, mongo):
        evid = f"event_{uuid.uuid4().hex[:12]}"
        mongo.events.insert_one({
            "event_id": evid,
            "title": "TEST Attendees",
            "description": "x",
            "college_id": None,
            "location": "x",
            "date": "2026-05-01T00:00:00Z",
            "cover_image": None,
            "category": "fest",
            "host_user_id": "h",
            "host_name": "h",
            "attendees": [user_a["user_id"], user_b["user_id"]],
            "attendee_count": 2,
            "created_at": datetime.now(timezone.utc),
        })
        r = api_client.get(
            f"{base_url}/api/events/{evid}/attendees",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["count"] == 2
        ids = [u["user_id"] for u in data["attendees"]]
        assert user_a["user_id"] in ids
        assert user_b["user_id"] in ids
        # cleanup
        mongo.events.delete_one({"event_id": evid})


# ============= STORIES =============
class TestStories:
    def test_create_story(self, api_client, base_url, user_a, mongo):
        r = api_client.post(
            f"{base_url}/api/stories/create",
            json={"image": TINY_B64, "caption": "TEST_story"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        story = r.json()["story"]
        assert "story_id" in story
        assert story["user_id"] == user_a["user_id"]
        assert story["caption"] == "TEST_story"
        assert "expires_at" in story
        assert "created_at" in story
        # 24-hour expiry sanity check (parse ISO)
        created = datetime.fromisoformat(story["created_at"].replace("Z", "+00:00"))
        expires = datetime.fromisoformat(story["expires_at"].replace("Z", "+00:00"))
        delta = expires - created
        # ~24h
        assert 23 * 3600 <= delta.total_seconds() <= 25 * 3600
        # cleanup
        mongo.stories.delete_one({"story_id": story["story_id"]})

    def test_stories_feed_returns_active(self, api_client, base_url, user_a, mongo):
        # Create one active and one expired
        active_id = f"story_{uuid.uuid4().hex[:12]}"
        expired_id = f"story_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        # ensure user_a has a college
        college = mongo.colleges.find_one({})
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"college_id": college["college_id"], "is_premium": True}},
        )
        mongo.stories.insert_many([
            {
                "story_id": active_id,
                "user_id": user_a["user_id"],
                "user_name": "USERA",
                "user_picture": None,
                "college_id": college["college_id"],
                "image": "x",
                "caption": "active",
                "views": [],
                "created_at": now,
                "expires_at": now + timedelta(hours=10),
            },
            {
                "story_id": expired_id,
                "user_id": user_a["user_id"],
                "user_name": "USERA",
                "user_picture": None,
                "college_id": college["college_id"],
                "image": "x",
                "caption": "expired",
                "views": [],
                "created_at": now - timedelta(hours=30),
                "expires_at": now - timedelta(hours=6),
            },
        ])
        r = api_client.get(
            f"{base_url}/api/stories/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        groups = r.json()["users_with_stories"]
        # Flatten to story ids
        all_story_ids = []
        for g in groups:
            for s in g["stories"]:
                all_story_ids.append(s["story_id"])
        assert active_id in all_story_ids
        assert expired_id not in all_story_ids
        # Verify grouping by user
        my_group = next((g for g in groups if g["user_id"] == user_a["user_id"]), None)
        assert my_group is not None
        # cleanup
        mongo.stories.delete_many({"story_id": {"$in": [active_id, expired_id]}})

    def test_story_view_marks_viewed(self, api_client, base_url, user_a, user_b, mongo):
        sid = f"story_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        mongo.stories.insert_one({
            "story_id": sid,
            "user_id": user_a["user_id"],
            "user_name": "USERA",
            "user_picture": None,
            "college_id": None,
            "image": "x",
            "caption": "c",
            "views": [],
            "created_at": now,
            "expires_at": now + timedelta(hours=10),
        })
        r = api_client.post(
            f"{base_url}/api/stories/{sid}/view",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert r.status_code == 200
        s = mongo.stories.find_one({"story_id": sid})
        assert user_b["user_id"] in s["views"]
        # cleanup
        mongo.stories.delete_one({"story_id": sid})

    def test_stories_feed_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/stories/feed")
        assert r.status_code == 401


# ============= LEADERBOARD =============
class TestLeaderboard:
    def test_top_vibes_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/leaderboard/top-vibes")
        assert r.status_code == 401

    def test_top_vibes_returns_list(self, api_client, base_url, user_a, mongo):
        # Make user_a premium to see global
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"is_premium": True, "verification_status": "verified"}},
        )
        # Ensure at least one user has total_ratings > 0
        seeded = mongo.users.find_one({"total_ratings": {"$gt": 0}})
        if not seeded:
            # Bump a dummy seeded user
            any_u = mongo.users.find_one({"name": {"$regex": "^[A-Z]"}})
            if any_u:
                mongo.users.update_one(
                    {"user_id": any_u["user_id"]},
                    {"$set": {"total_ratings": 1, "rating_sum": 5.0, "vibe_score": 5.0}},
                )
        r = api_client.get(
            f"{base_url}/api/leaderboard/top-vibes",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200, r.text
        top = r.json()["top_vibes"]
        assert isinstance(top, list)
        # Should be sorted descending by vibe_score
        scores = [u["vibe_score"] for u in top]
        assert scores == sorted(scores, reverse=True)

    def test_top_vibes_college_gating(self, api_client, base_url, user_a, mongo):
        """Non-premium leaderboard should only contain same-college users."""
        college = mongo.colleges.find_one({})
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"college_id": college["college_id"], "is_premium": False}},
        )
        r = api_client.get(
            f"{base_url}/api/leaderboard/top-vibes",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        for u in r.json()["top_vibes"]:
            assert u.get("college_id") == college["college_id"]


# ============= REGRESSION: existing endpoints still work =============
class TestRegression:
    def test_auth_me(self, api_client, base_url, user_a):
        r = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        assert r.json()["user"]["user_id"] == user_a["user_id"]

    def test_auth_me_unauthenticated(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_discovery_profiles(self, api_client, base_url, user_a, mongo):
        # ensure college_id
        college = mongo.colleges.find_one({})
        mongo.users.update_one(
            {"user_id": user_a["user_id"]},
            {"$set": {"college_id": college["college_id"]}},
        )
        r = api_client.get(
            f"{base_url}/api/discovery/profiles",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        assert "profiles" in r.json()

    def test_confessions_feed(self, api_client, base_url, user_a):
        r = api_client.get(
            f"{base_url}/api/confessions/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        assert "confessions" in r.json()

    def test_messages_conversations(self, api_client, base_url, user_a):
        r = api_client.get(
            f"{base_url}/api/messages/conversations",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        assert "conversations" in r.json()

    def test_admin_login_regression(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/admin/login",
            json={"email": "admin@offcampus.com", "password": "OffCampus@2026"},
        )
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_colleges_list_regression(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/colleges/list")
        assert r.status_code == 200
        assert len(r.json()["colleges"]) >= 10

    def test_referrals_my_stats_regression(self, api_client, base_url, user_a):
        r = api_client.get(
            f"{base_url}/api/referrals/my-stats",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert r.status_code == 200
        assert "referral_code" in r.json()
