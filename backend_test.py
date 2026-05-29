#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Off Campus Dating App
Tests all endpoints and verifies database seed data
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://vibe-score-9.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

# Store session token for authenticated requests
session_token = None
test_user_id = None
test_college_id = None
test_confession_id = None
test_verification_request_id = None


def log_test(test_name: str, passed: bool, message: str = ""):
    """Log test result"""
    if passed:
        test_results["passed"] += 1
        print(f"✅ {test_name}")
    else:
        test_results["failed"] += 1
        error_msg = f"❌ {test_name}: {message}"
        print(error_msg)
        test_results["errors"].append(error_msg)


def make_request(method: str, endpoint: str, headers: Optional[Dict] = None, 
                 json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return response and success status"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=json_data, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=json_data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return None, False, "Invalid method"
        
        return response, True, ""
    except Exception as e:
        return None, False, str(e)


def get_auth_headers() -> Dict[str, str]:
    """Get authorization headers with session token"""
    if session_token:
        return {"Authorization": f"Bearer {session_token}"}
    return {}


# ============= TEST FUNCTIONS =============

def test_health_check():
    """Test health check endpoints"""
    print("\n=== Testing Health Check Endpoints ===")
    
    # Test root endpoint
    response, success, error = make_request("GET", "/")
    if success and response.status_code == 200:
        data = response.json()
        if data.get("message") == "Off Campus API":
            log_test("GET /api/ - Root endpoint", True)
        else:
            log_test("GET /api/ - Root endpoint", False, f"Unexpected response: {data}")
    else:
        log_test("GET /api/ - Root endpoint", False, error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test health endpoint
    response, success, error = make_request("GET", "/health")
    if success and response.status_code == 200:
        data = response.json()
        if data.get("status") == "healthy":
            log_test("GET /api/health - Health check", True)
        else:
            log_test("GET /api/health - Health check", False, f"Unexpected response: {data}")
    else:
        log_test("GET /api/health - Health check", False, error or f"Status: {response.status_code if response else 'N/A'}")


def test_colleges():
    """Test college endpoints"""
    global test_college_id
    print("\n=== Testing College Endpoints ===")
    
    # Test list colleges
    response, success, error = make_request("GET", "/colleges/list")
    if success and response.status_code == 200:
        data = response.json()
        colleges = data.get("colleges", [])
        if len(colleges) == 19:
            log_test("GET /api/colleges/list - Returns 19 colleges", True)
            test_college_id = colleges[0]["college_id"]
            
            # Verify some expected colleges
            college_names = [c["name"] for c in colleges]
            expected_colleges = ["St. Stephen's College", "IIT Delhi", "JNU", "DTU"]
            found_colleges = [name for name in expected_colleges if any(name in cn for cn in college_names)]
            if len(found_colleges) == len(expected_colleges):
                log_test("GET /api/colleges/list - Contains expected Delhi colleges", True)
            else:
                log_test("GET /api/colleges/list - Contains expected Delhi colleges", False, 
                        f"Missing colleges: {set(expected_colleges) - set(found_colleges)}")
        else:
            log_test("GET /api/colleges/list - Returns 19 colleges", False, f"Got {len(colleges)} colleges")
    else:
        log_test("GET /api/colleges/list", False, error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test get specific college
    if test_college_id:
        response, success, error = make_request("GET", f"/colleges/{test_college_id}")
        if success and response.status_code == 200:
            data = response.json()
            college = data.get("college", {})
            if college.get("college_id") == test_college_id:
                log_test(f"GET /api/colleges/{test_college_id} - Get college by ID", True)
            else:
                log_test(f"GET /api/colleges/{test_college_id} - Get college by ID", False, "College ID mismatch")
        else:
            log_test(f"GET /api/colleges/{test_college_id} - Get college by ID", False, 
                    error or f"Status: {response.status_code if response else 'N/A'}")


def test_auth_endpoints_exist():
    """Test that auth endpoints exist (without actually testing OAuth)"""
    print("\n=== Testing Auth Endpoints (Existence) ===")
    
    # Test google-session endpoint exists (will fail without valid session_id)
    response, success, error = make_request("POST", "/auth/google-session", json_data={"session_id": "test"})
    if success and response.status_code in [401, 422]:  # Expected to fail
        log_test("POST /api/auth/google-session - Endpoint exists", True)
    else:
        log_test("POST /api/auth/google-session - Endpoint exists", False, 
                error or f"Unexpected status: {response.status_code if response else 'N/A'}")
    
    # Test /me endpoint (should fail without auth)
    response, success, error = make_request("GET", "/auth/me")
    if success and response.status_code == 401:
        log_test("GET /api/auth/me - Endpoint exists (requires auth)", True)
    else:
        log_test("GET /api/auth/me - Endpoint exists", False, 
                error or f"Unexpected status: {response.status_code if response else 'N/A'}")
    
    # Test logout endpoint (should fail without auth)
    response, success, error = make_request("POST", "/auth/logout")
    if success and response.status_code == 401:
        log_test("POST /api/auth/logout - Endpoint exists (requires auth)", True)
    else:
        log_test("POST /api/auth/logout - Endpoint exists", False, 
                error or f"Unexpected status: {response.status_code if response else 'N/A'}")


def create_test_user_session():
    """Create a test user and session directly in the database for testing"""
    global session_token, test_user_id
    print("\n=== Creating Test User Session ===")
    
    # We'll use MongoDB directly to create a test user and session
    from pymongo import MongoClient
    import uuid
    from datetime import datetime, timezone, timedelta
    
    try:
        client = MongoClient("mongodb://localhost:27017")
        db = client["test_database"]
        
        # Create test user
        test_user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"test_session_{uuid.uuid4().hex}"
        
        test_user = {
            "user_id": test_user_id,
            "email": "testuser@example.com",
            "name": "Test User",
            "age": 22,
            "gender": "male",
            "college_id": test_college_id,
            "year": "3rd Year",
            "course": "Computer Science",
            "bio": "Test user for API testing",
            "interests": ["Testing", "APIs", "Coding"],
            "looking_for": "friends",
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
            "rating_sum": 0.0
        }
        
        # Insert user
        db.users.insert_one(test_user)
        
        # Create session
        test_session = {
            "session_token": session_token,
            "user_id": test_user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
        }
        
        db.user_sessions.insert_one(test_session)
        
        log_test("Create test user and session", True)
        print(f"   Test User ID: {test_user_id}")
        print(f"   Session Token: {session_token[:20]}...")
        
        client.close()
        return True
        
    except Exception as e:
        log_test("Create test user and session", False, str(e))
        return False


def test_profile_endpoints():
    """Test profile management endpoints"""
    print("\n=== Testing Profile Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping profile tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test update profile
    update_data = {
        "bio": "Updated bio for testing",
        "interests": ["Testing", "APIs", "Python"],
        "age": 23
    }
    response, success, error = make_request("PATCH", "/profile/update", headers=headers, json_data=update_data)
    if success and response.status_code == 200:
        data = response.json()
        user = data.get("user", {})
        if user.get("bio") == "Updated bio for testing" and user.get("age") == 23:
            log_test("PATCH /api/profile/update - Update profile", True)
        else:
            log_test("PATCH /api/profile/update - Update profile", False, "Profile not updated correctly")
    else:
        log_test("PATCH /api/profile/update - Update profile", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test add photo
    photo_data = {
        "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    response, success, error = make_request("POST", "/profile/photos", headers=headers, json_data=photo_data)
    if success and response.status_code == 200:
        data = response.json()
        user = data.get("user", {})
        if len(user.get("photos", [])) > 0:
            log_test("POST /api/profile/photos - Add photo", True)
        else:
            log_test("POST /api/profile/photos - Add photo", False, "Photo not added")
    else:
        log_test("POST /api/profile/photos - Add photo", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test delete photo
    response, success, error = make_request("DELETE", "/profile/photos/0", headers=headers)
    if success and response.status_code == 200:
        log_test("DELETE /api/profile/photos/{index} - Delete photo", True)
    else:
        log_test("DELETE /api/profile/photos/{index} - Delete photo", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test update Spotify data
    spotify_data = {
        "top_tracks": ["Track 1", "Track 2", "Track 3"],
        "top_artists": ["Artist 1", "Artist 2"]
    }
    response, success, error = make_request("POST", "/profile/spotify", headers=headers, json_data=spotify_data)
    if success and response.status_code == 200:
        data = response.json()
        user = data.get("user", {})
        spotify = user.get("spotify_data", {})
        if len(spotify.get("top_tracks", [])) == 3:
            log_test("POST /api/profile/spotify - Update Spotify data", True)
        else:
            log_test("POST /api/profile/spotify - Update Spotify data", False, "Spotify data not updated")
    else:
        log_test("POST /api/profile/spotify - Update Spotify data", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")


def test_verification_endpoints():
    """Test verification endpoints"""
    global test_verification_request_id
    print("\n=== Testing Verification Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping verification tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test submit verification
    verification_data = {
        "college_id": test_college_id,
        "id_card_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    response, success, error = make_request("POST", "/verification/submit", headers=headers, json_data=verification_data)
    if success and response.status_code == 200:
        data = response.json()
        test_verification_request_id = data.get("request_id")
        if test_verification_request_id:
            log_test("POST /api/verification/submit - Submit verification", True)
        else:
            log_test("POST /api/verification/submit - Submit verification", False, "No request_id returned")
    else:
        log_test("POST /api/verification/submit - Submit verification", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")


def test_discovery_endpoints():
    """Test discovery/matching endpoints"""
    print("\n=== Testing Discovery Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping discovery tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test get discovery profiles
    response, success, error = make_request("GET", "/discovery/profiles", headers=headers)
    if success and response.status_code == 200:
        data = response.json()
        profiles = data.get("profiles", [])
        log_test("GET /api/discovery/profiles - Get profiles", True)
        print(f"   Found {len(profiles)} profiles")
    else:
        log_test("GET /api/discovery/profiles - Get profiles", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Get a target user for like/pass tests
    from pymongo import MongoClient
    try:
        client = MongoClient("mongodb://localhost:27017")
        db = client["test_database"]
        target_user = db.users.find_one({"user_id": {"$ne": test_user_id}, "verification_status": "verified"})
        client.close()
        
        if target_user:
            target_user_id = target_user["user_id"]
            
            # Test like user
            like_data = {"target_user_id": target_user_id}
            response, success, error = make_request("POST", "/discovery/like", headers=headers, json_data=like_data)
            if success and response.status_code == 200:
                data = response.json()
                if "is_match" in data:
                    log_test("POST /api/discovery/like - Like user", True)
                else:
                    log_test("POST /api/discovery/like - Like user", False, "No is_match in response")
            else:
                log_test("POST /api/discovery/like - Like user", False, 
                        error or f"Status: {response.status_code if response else 'N/A'}")
            
            # Test pass user
            pass_data = {"target_user_id": target_user_id}
            response, success, error = make_request("POST", "/discovery/pass", headers=headers, json_data=pass_data)
            if success and response.status_code == 200:
                log_test("POST /api/discovery/pass - Pass user", True)
            else:
                log_test("POST /api/discovery/pass - Pass user", False, 
                        error or f"Status: {response.status_code if response else 'N/A'}")
    except Exception as e:
        log_test("Discovery like/pass tests", False, f"Database error: {str(e)}")
    
    # Test get matches
    response, success, error = make_request("GET", "/discovery/matches", headers=headers)
    if success and response.status_code == 200:
        data = response.json()
        matches = data.get("matches", [])
        log_test("GET /api/discovery/matches - Get matches", True)
        print(f"   Found {len(matches)} matches")
    else:
        log_test("GET /api/discovery/matches - Get matches", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")


def test_location_endpoints():
    """Test location tracking endpoints"""
    print("\n=== Testing Location Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping location tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test update location (using coordinates near a college)
    location_data = {
        "latitude": 28.6906,
        "longitude": 77.2160
    }
    response, success, error = make_request("POST", "/location/update", headers=headers, json_data=location_data)
    if success and response.status_code == 200:
        data = response.json()
        if "is_on_campus" in data and "distance_km" in data:
            log_test("POST /api/location/update - Update location", True)
            print(f"   On campus: {data['is_on_campus']}, Distance: {data['distance_km']} km")
        else:
            log_test("POST /api/location/update - Update location", False, "Missing response fields")
    else:
        log_test("POST /api/location/update - Update location", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test get campus users
    response, success, error = make_request("GET", "/location/campus-users", headers=headers)
    if success and response.status_code == 200:
        data = response.json()
        users = data.get("users", [])
        log_test("GET /api/location/campus-users - Get campus users", True)
        print(f"   Found {len(users)} users on campus")
    else:
        log_test("GET /api/location/campus-users - Get campus users", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")


def test_confessions_endpoints():
    """Test confessions endpoints"""
    global test_confession_id
    print("\n=== Testing Confessions Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping confessions tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test create confession
    confession_data = {
        "content": "This is a test confession for API testing",
        "college_id": test_college_id
    }
    response, success, error = make_request("POST", "/confessions/create", headers=headers, json_data=confession_data)
    if success and response.status_code == 200:
        data = response.json()
        confession = data.get("confession", {})
        test_confession_id = confession.get("confession_id")
        if test_confession_id:
            log_test("POST /api/confessions/create - Create confession", True)
        else:
            log_test("POST /api/confessions/create - Create confession", False, "No confession_id returned")
    else:
        log_test("POST /api/confessions/create - Create confession", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    # Test get confessions feed
    response, success, error = make_request("GET", "/confessions/feed", headers=headers)
    if success and response.status_code == 200:
        data = response.json()
        confessions = data.get("confessions", [])
        log_test("GET /api/confessions/feed - Get confessions feed", True)
        print(f"   Found {len(confessions)} confessions")
    else:
        log_test("GET /api/confessions/feed - Get confessions feed", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    if test_confession_id:
        # Test like confession
        response, success, error = make_request("POST", f"/confessions/{test_confession_id}/like", headers=headers)
        if success and response.status_code == 200:
            log_test(f"POST /api/confessions/{test_confession_id}/like - Like confession", True)
        else:
            log_test(f"POST /api/confessions/{test_confession_id}/like - Like confession", False, 
                    error or f"Status: {response.status_code if response else 'N/A'}")
        
        # Test add comment
        comment_data = {"content": "This is a test comment"}
        response, success, error = make_request("POST", f"/confessions/{test_confession_id}/comment", 
                                               headers=headers, json_data=comment_data)
        if success and response.status_code == 200:
            log_test(f"POST /api/confessions/{test_confession_id}/comment - Add comment", True)
        else:
            log_test(f"POST /api/confessions/{test_confession_id}/comment - Add comment", False, 
                    error or f"Status: {response.status_code if response else 'N/A'}")
        
        # Test get comments
        response, success, error = make_request("GET", f"/confessions/{test_confession_id}/comments", headers=headers)
        if success and response.status_code == 200:
            data = response.json()
            comments = data.get("comments", [])
            log_test(f"GET /api/confessions/{test_confession_id}/comments - Get comments", True)
            print(f"   Found {len(comments)} comments")
        else:
            log_test(f"GET /api/confessions/{test_confession_id}/comments - Get comments", False, 
                    error or f"Status: {response.status_code if response else 'N/A'}")


def test_ratings_endpoints():
    """Test ratings endpoints"""
    print("\n=== Testing Ratings Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping ratings tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Get a target user for rating
    from pymongo import MongoClient
    try:
        client = MongoClient("mongodb://localhost:27017")
        db = client["test_database"]
        target_user = db.users.find_one({"user_id": {"$ne": test_user_id}})
        client.close()
        
        if target_user:
            target_user_id = target_user["user_id"]
            
            # Test create rating
            rating_data = {
                "to_user_id": target_user_id,
                "score": 4.5
            }
            response, success, error = make_request("POST", "/ratings/create", headers=headers, json_data=rating_data)
            if success and response.status_code == 200:
                log_test("POST /api/ratings/create - Create rating", True)
            else:
                log_test("POST /api/ratings/create - Create rating", False, 
                        error or f"Status: {response.status_code if response else 'N/A'}")
        else:
            log_test("POST /api/ratings/create - Create rating", False, "No target user found")
    except Exception as e:
        log_test("POST /api/ratings/create - Create rating", False, f"Database error: {str(e)}")


def test_admin_endpoints():
    """Test admin endpoints"""
    print("\n=== Testing Admin Endpoints ===")
    
    if not session_token:
        print("⚠️  Skipping admin tests - no session token")
        return
    
    headers = get_auth_headers()
    
    # Test get verification requests
    response, success, error = make_request("GET", "/admin/verification-requests", headers=headers)
    if success and response.status_code == 200:
        data = response.json()
        requests_list = data.get("requests", [])
        log_test("GET /api/admin/verification-requests - Get verification requests", True)
        print(f"   Found {len(requests_list)} pending requests")
    else:
        log_test("GET /api/admin/verification-requests - Get verification requests", False, 
                error or f"Status: {response.status_code if response else 'N/A'}")
    
    if test_verification_request_id:
        # Test approve verification
        response, success, error = make_request("POST", f"/admin/verification/{test_verification_request_id}/approve", 
                                               headers=headers)
        if success and response.status_code == 200:
            log_test(f"POST /api/admin/verification/{test_verification_request_id}/approve - Approve verification", True)
        else:
            log_test(f"POST /api/admin/verification/{test_verification_request_id}/approve - Approve verification", False, 
                    error or f"Status: {response.status_code if response else 'N/A'}")
        
        # Create another verification request for reject test
        verification_data = {
            "college_id": test_college_id,
            "id_card_image": "data:image/png;base64,test"
        }
        response, success, error = make_request("POST", "/verification/submit", headers=headers, json_data=verification_data)
        if success and response.status_code == 200:
            data = response.json()
            reject_request_id = data.get("request_id")
            
            # Test reject verification
            response, success, error = make_request("POST", f"/admin/verification/{reject_request_id}/reject", 
                                                   headers=headers)
            if success and response.status_code == 200:
                log_test(f"POST /api/admin/verification/{reject_request_id}/reject - Reject verification", True)
            else:
                log_test(f"POST /api/admin/verification/{reject_request_id}/reject - Reject verification", False, 
                        error or f"Status: {response.status_code if response else 'N/A'}")


def test_database_seed_data():
    """Verify database seed data"""
    print("\n=== Verifying Database Seed Data ===")
    
    from pymongo import MongoClient
    try:
        client = MongoClient("mongodb://localhost:27017")
        db = client["test_database"]
        
        # Check colleges count
        college_count = db.colleges.count_documents({})
        if college_count == 19:
            log_test("Database - 19 Delhi colleges seeded", True)
        else:
            log_test("Database - 19 Delhi colleges seeded", False, f"Found {college_count} colleges")
        
        # Check dummy users count (should be at least 5)
        user_count = db.users.count_documents({"verification_status": "verified"})
        if user_count >= 5:
            log_test("Database - At least 5 dummy users seeded", True)
            print(f"   Found {user_count} verified users")
        else:
            log_test("Database - At least 5 dummy users seeded", False, f"Found only {user_count} verified users")
        
        client.close()
        
    except Exception as e:
        log_test("Database seed data verification", False, f"Database error: {str(e)}")


# ============= MAIN TEST RUNNER =============

def main():
    """Run all tests"""
    print("=" * 70)
    print("OFF CAMPUS DATING APP - BACKEND API TESTS")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print("=" * 70)
    
    # Run tests in order
    test_health_check()
    test_colleges()
    test_database_seed_data()
    test_auth_endpoints_exist()
    
    # Create test user session for authenticated endpoints
    if create_test_user_session():
        test_profile_endpoints()
        test_verification_endpoints()
        test_discovery_endpoints()
        test_location_endpoints()
        test_confessions_endpoints()
        test_ratings_endpoints()
        test_admin_endpoints()
    else:
        print("\n⚠️  Could not create test user session - skipping authenticated endpoint tests")
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"📊 Total: {test_results['passed'] + test_results['failed']}")
    
    if test_results['failed'] > 0:
        print("\n" + "=" * 70)
        print("FAILED TESTS:")
        print("=" * 70)
        for error in test_results['errors']:
            print(error)
    
    print("\n" + "=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if test_results['failed'] == 0 else 1)


if __name__ == "__main__":
    main()
