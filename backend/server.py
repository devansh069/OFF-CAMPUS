from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import httpx
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import base64
import secrets
import string
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Admin config
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@offcampus.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'OffCampus@2026')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
ADMIN_PASSWORD_HASH = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============= ENUMS =============
class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class LookingFor(str, Enum):
    DATING = "dating"
    FRIENDS = "friends"
    NETWORKING = "networking"
    ALL = "all"


# ============= MODELS =============
class College(BaseModel):
    college_id: str = Field(default_factory=lambda: f"college_{uuid.uuid4().hex[:12]}")
    name: str
    short_name: str
    location: str
    latitude: float
    longitude: float
    email_domains: List[str]
    type: str  # "university", "college", "institute"
    city: str = "Delhi"
    
class SpotifyData(BaseModel):
    top_tracks: List[str] = []
    top_artists: List[str] = []
    
class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    age: Optional[int] = None
    gender: Optional[Gender] = None
    college_id: Optional[str] = None
    year: Optional[str] = None  # "1st Year", "2nd Year", etc.
    course: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str] = []
    looking_for: Optional[LookingFor] = None
    photos: List[str] = []  # base64 encoded images
    vibe_score: float = 5.0
    spotify_data: SpotifyData = Field(default_factory=SpotifyData)
    is_premium: bool = False
    verification_status: VerificationStatus = VerificationStatus.PENDING
    picture: Optional[str] = None
    is_on_campus: bool = False
    last_location_update: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_ratings: int = 0
    rating_sum: float = 0.0
    
class Session(BaseModel):
    session_token: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))

class VerificationRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    user_id: str
    college_id: str
    id_card_image: str  # base64
    status: VerificationStatus = VerificationStatus.PENDING
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

class Like(BaseModel):
    like_id: str = Field(default_factory=lambda: f"like_{uuid.uuid4().hex[:12]}")
    from_user_id: str
    to_user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_match: bool = False

class Confession(BaseModel):
    confession_id: str = Field(default_factory=lambda: f"conf_{uuid.uuid4().hex[:12]}")
    user_id: str  # For tracking, but displayed as anonymous
    college_id: Optional[str] = None  # None means general
    content: str
    likes: int = 0
    comments: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class Comment(BaseModel):
    comment_id: str = Field(default_factory=lambda: f"cmt_{uuid.uuid4().hex[:12]}")
    confession_id: str
    user_id: str  # Anonymous
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Rating(BaseModel):
    rating_id: str = Field(default_factory=lambda: f"rate_{uuid.uuid4().hex[:12]}")
    from_user_id: str
    to_user_id: str
    score: float  # 1-5
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============= REQUEST/RESPONSE MODELS =============
class LoginResponse(BaseModel):
    session_token: str
    user: Dict[str, Any]

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    college_id: Optional[str] = None
    year: Optional[str] = None
    course: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    looking_for: Optional[LookingFor] = None
    
class PhotoUploadRequest(BaseModel):
    photo: str  # base64
    
class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    
class VerificationSubmitRequest(BaseModel):
    college_id: str
    id_card_image: str  # base64
    
class LikeActionRequest(BaseModel):
    target_user_id: str
    
class ConfessionCreateRequest(BaseModel):
    content: str
    college_id: Optional[str] = None
    
class CommentCreateRequest(BaseModel):
    content: str
    
class RatingCreateRequest(BaseModel):
    to_user_id: str
    score: float
    
class SpotifyUpdateRequest(BaseModel):
    top_tracks: List[str]
    top_artists: List[str]


# ============= HELPER FUNCTIONS =============
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extract and validate user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    
    # Look up session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiration
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

def generate_referral_code(name: str) -> str:
    """Generate a unique referral code"""
    prefix = "".join([c for c in (name or "USER").upper() if c.isalpha()])[:4] or "USER"
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"{prefix}{suffix}"

def create_admin_jwt() -> str:
    """Create admin JWT token"""
    payload = {
        "sub": ADMIN_EMAIL,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def verify_admin(authorization: Optional[str] = Header(None)) -> str:
    """Verify admin JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized as admin")
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")


# ============= AUTH ROUTES =============
@api_router.post("/auth/google-session", response_model=LoginResponse)
async def google_session_login(session_id: str, referral_code: Optional[str] = None):
    """Process Google OAuth session and create/update user"""
    async with httpx.AsyncClient() as http_client:
        try:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            response.raise_for_status()
            session_data = response.json()
        except Exception as e:
            logger.error(f"Failed to fetch session data: {e}")
            raise HTTPException(status_code=401, detail="Invalid session ID")
    
    # Extract data
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update picture if changed
        if picture != existing_user.get("picture"):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": picture}}
            )
    else:
        # Check if email matches a college domain (auto-verify)
        email_domain = email.split("@")[-1].lower() if "@" in email else ""
        matching_college = await db.colleges.find_one(
            {"email_domains": email_domain},
            {"_id": 0}
        )
        
        # Generate referral code
        ref_code = generate_referral_code(name)
        
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        verification_status = VerificationStatus.VERIFIED if matching_college else VerificationStatus.PENDING
        
        new_user_dict = User(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture,
            verification_status=verification_status,
            college_id=matching_college["college_id"] if matching_college else None,
        ).dict()
        new_user_dict["referral_code"] = ref_code
        new_user_dict["referred_by"] = None
        new_user_dict["referral_count"] = 0
        new_user_dict["premium_until"] = None
        
        await db.users.insert_one(new_user_dict)
        
        # Process referral if provided
        if referral_code:
            referrer = await db.users.find_one({"referral_code": referral_code}, {"_id": 0})
            if referrer:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"referred_by": referrer["user_id"]}}
                )
                # Reward referrer with 7 days premium
                current_premium = referrer.get("premium_until")
                if current_premium and isinstance(current_premium, datetime):
                    if current_premium.tzinfo is None:
                        current_premium = current_premium.replace(tzinfo=timezone.utc)
                    new_premium = max(current_premium, datetime.now(timezone.utc)) + timedelta(days=7)
                else:
                    new_premium = datetime.now(timezone.utc) + timedelta(days=7)
                
                await db.users.update_one(
                    {"user_id": referrer["user_id"]},
                    {
                        "$set": {"premium_until": new_premium, "is_premium": True},
                        "$inc": {"referral_count": 1}
                    }
                )
    
    # Create session
    session_obj = Session(
        session_token=session_token,
        user_id=user_id
    )
    await db.user_sessions.insert_one(session_obj.dict())
    
    # Get updated user
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return LoginResponse(session_token=session_token, user=user)

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user profile"""
    user = await get_current_user(authorization)
    return {"user": user}

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout and delete session"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    await db.user_sessions.delete_one({"session_token": token})
    
    return {"message": "Logged out successfully"}


# ============= PROFILE ROUTES =============
@api_router.patch("/profile/update")
async def update_profile(
    request: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Update user profile"""
    user = await get_current_user(authorization)
    
    # Build update dict
    update_data = {}
    if request.name is not None:
        update_data["name"] = request.name
    if request.age is not None:
        update_data["age"] = request.age
    if request.gender is not None:
        update_data["gender"] = request.gender
    if request.college_id is not None:
        update_data["college_id"] = request.college_id
    if request.year is not None:
        update_data["year"] = request.year
    if request.course is not None:
        update_data["course"] = request.course
    if request.bio is not None:
        update_data["bio"] = request.bio
    if request.interests is not None:
        update_data["interests"] = request.interests
    if request.looking_for is not None:
        update_data["looking_for"] = request.looking_for
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    # Return updated user
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": updated_user}

@api_router.post("/profile/photos")
async def add_photo(
    request: PhotoUploadRequest,
    authorization: Optional[str] = Header(None)
):
    """Add photo to profile"""
    user = await get_current_user(authorization)
    
    # Add photo to array
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"photos": request.photo}}
    )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": updated_user}

@api_router.delete("/profile/photos/{index}")
async def delete_photo(
    index: int,
    authorization: Optional[str] = Header(None)
):
    """Delete photo from profile"""
    user = await get_current_user(authorization)
    
    photos = user.get("photos", [])
    if 0 <= index < len(photos):
        photos.pop(index)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"photos": photos}}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": updated_user}

@api_router.post("/profile/spotify")
async def update_spotify(
    request: SpotifyUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Update Spotify data"""
    user = await get_current_user(authorization)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "spotify_data.top_tracks": request.top_tracks,
            "spotify_data.top_artists": request.top_artists
        }}
    )
    
    # Bonus vibe score for having Spotify data
    if request.top_tracks or request.top_artists:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"vibe_score": 0.5}}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": updated_user}


# ============= VERIFICATION ROUTES =============
@api_router.post("/verification/submit")
async def submit_verification(
    request: VerificationSubmitRequest,
    authorization: Optional[str] = Header(None)
):
    """Submit ID card for verification"""
    user = await get_current_user(authorization)
    
    verification = VerificationRequest(
        user_id=user["user_id"],
        college_id=request.college_id,
        id_card_image=request.id_card_image
    )
    
    await db.verification_requests.insert_one(verification.dict())
    
    # Update user's college and status
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "college_id": request.college_id,
            "verification_status": VerificationStatus.PENDING
        }}
    )
    
    return {"message": "Verification request submitted", "request_id": verification.request_id}


# ============= COLLEGE ROUTES =============
@api_router.get("/colleges/list")
async def list_colleges():
    """Get all colleges"""
    colleges = await db.colleges.find({}, {"_id": 0}).to_list(1000)
    return {"colleges": colleges}

@api_router.get("/colleges/{college_id}")
async def get_college(college_id: str):
    """Get college details"""
    college = await db.colleges.find_one({"college_id": college_id}, {"_id": 0})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    return {"college": college}


# ============= LOCATION ROUTES =============
@api_router.post("/location/update")
async def update_location(
    request: LocationUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Update user location and check if on campus"""
    user = await get_current_user(authorization)
    
    if not user.get("college_id"):
        raise HTTPException(status_code=400, detail="Please select a college first")
    
    # Get college location
    college = await db.colleges.find_one({"college_id": user["college_id"]}, {"_id": 0})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    
    # Calculate distance
    distance = calculate_distance(
        request.latitude, request.longitude,
        college["latitude"], college["longitude"]
    )
    
    # Check if within 0.5km (on campus)
    is_on_campus = distance <= 0.5
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "is_on_campus": is_on_campus,
            "last_location_update": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "is_on_campus": is_on_campus,
        "distance_km": round(distance, 2)
    }

@api_router.get("/location/campus-users")
async def get_campus_users(
    authorization: Optional[str] = Header(None)
):
    """Get users currently on campus"""
    user = await get_current_user(authorization)
    
    if not user.get("college_id"):
        return {"users": []}
    
    # Get users on same campus (updated in last 30 minutes)
    thirty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    campus_users = await db.users.find({
        "college_id": user["college_id"],
        "is_on_campus": True,
        "user_id": {"$ne": user["user_id"]},
        "verification_status": VerificationStatus.VERIFIED,
        "last_location_update": {"$gte": thirty_mins_ago}
    }, {"_id": 0, "email": 0}).to_list(100)
    
    return {"users": campus_users, "count": len(campus_users)}


# ============= DISCOVERY ROUTES =============
@api_router.get("/discovery/profiles")
async def get_discovery_profiles(
    authorization: Optional[str] = Header(None),
    limit: int = 20
):
    """Get profiles for discovery/swiping"""
    user = await get_current_user(authorization)
    
    if not user.get("college_id"):
        raise HTTPException(status_code=400, detail="Please complete your profile and select a college")
    
    # Get users already liked or passed
    liked_users = await db.likes.find(
        {"from_user_id": user["user_id"]},
        {"to_user_id": 1, "_id": 0}
    ).to_list(1000)
    liked_user_ids = [like["to_user_id"] for like in liked_users]
    
    # Build query
    query = {
        "user_id": {"$ne": user["user_id"], "$nin": liked_user_ids},
        "verification_status": VerificationStatus.VERIFIED,
        "photos": {"$ne": []}
    }
    
    # If premium, show all colleges, else only same college
    if not user.get("is_premium"):
        query["college_id"] = user["college_id"]
    
    profiles = await db.users.find(
        query,
        {"_id": 0, "email": 0}
    ).limit(limit).to_list(limit)
    
    return {"profiles": profiles}

@api_router.post("/discovery/like")
async def like_user(
    request: LikeActionRequest,
    authorization: Optional[str] = Header(None)
):
    """Like a user"""
    user = await get_current_user(authorization)
    
    # Check if already liked
    existing_like = await db.likes.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": request.target_user_id
    })
    
    if existing_like:
        return {"message": "Already liked", "is_match": existing_like.get("is_match", False)}
    
    # Check if they liked us back (match!)
    reverse_like = await db.likes.find_one({
        "from_user_id": request.target_user_id,
        "to_user_id": user["user_id"]
    })
    
    is_match = reverse_like is not None
    
    # Create like
    like = Like(
        from_user_id=user["user_id"],
        to_user_id=request.target_user_id,
        is_match=is_match
    )
    await db.likes.insert_one(like.dict())
    
    # Update reverse like if match
    if is_match:
        await db.likes.update_one(
            {
                "from_user_id": request.target_user_id,
                "to_user_id": user["user_id"]
            },
            {"$set": {"is_match": True}}
        )
    
    return {"message": "Liked", "is_match": is_match}

@api_router.post("/discovery/pass")
async def pass_user(
    request: LikeActionRequest,
    authorization: Optional[str] = Header(None)
):
    """Pass on a user (store as like with negative flag or just skip)"""
    user = await get_current_user(authorization)
    
    # We can just return success - no need to store passes
    return {"message": "Passed"}

@api_router.get("/discovery/matches")
async def get_matches(
    authorization: Optional[str] = Header(None)
):
    """Get all matches"""
    user = await get_current_user(authorization)
    
    # Get all likes where is_match = True
    matches = await db.likes.find({
        "from_user_id": user["user_id"],
        "is_match": True
    }, {"_id": 0}).to_list(100)
    
    # Get user details for matches
    match_user_ids = [match["to_user_id"] for match in matches]
    match_users = await db.users.find(
        {"user_id": {"$in": match_user_ids}},
        {"_id": 0, "email": 0}
    ).to_list(100)
    
    return {"matches": match_users}


# ============= CONFESSIONS ROUTES =============
@api_router.post("/confessions/create")
async def create_confession(
    request: ConfessionCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """Create a confession"""
    user = await get_current_user(authorization)
    
    confession = Confession(
        user_id=user["user_id"],
        college_id=request.college_id,
        content=request.content
    )
    
    await db.confessions.insert_one(confession.dict())
    
    return {"confession": confession.dict()}

@api_router.get("/confessions/feed")
async def get_confessions_feed(
    authorization: Optional[str] = Header(None),
    college_id: Optional[str] = None,
    limit: int = 50
):
    """Get confessions feed"""
    user = await get_current_user(authorization)
    
    query = {}
    if college_id:
        query["college_id"] = college_id
    elif user.get("college_id"):
        # Show college-specific and general confessions
        query["$or"] = [
            {"college_id": user["college_id"]},
            {"college_id": None}
        ]
    
    confessions = await db.confessions.find(
        query,
        {"_id": 0, "user_id": 0}  # Hide user_id for anonymity
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"confessions": confessions}

@api_router.post("/confessions/{confession_id}/like")
async def like_confession(
    confession_id: str,
    authorization: Optional[str] = Header(None)
):
    """Like a confession"""
    user = await get_current_user(authorization)
    
    result = await db.confessions.update_one(
        {"confession_id": confession_id},
        {"$inc": {"likes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Confession not found")
    
    return {"message": "Liked"}

@api_router.post("/confessions/{confession_id}/comment")
async def add_comment(
    confession_id: str,
    request: CommentCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """Add comment to confession"""
    user = await get_current_user(authorization)
    
    comment = Comment(
        confession_id=confession_id,
        user_id=user["user_id"],
        content=request.content
    )
    
    await db.comments.insert_one(comment.dict())
    
    # Increment comment count
    await db.confessions.update_one(
        {"confession_id": confession_id},
        {"$inc": {"comments": 1}}
    )
    
    return {"comment": comment.dict()}

@api_router.get("/confessions/{confession_id}/comments")
async def get_comments(
    confession_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get comments for a confession"""
    user = await get_current_user(authorization)
    
    comments = await db.comments.find(
        {"confession_id": confession_id},
        {"_id": 0, "user_id": 0}  # Hide user_id for anonymity
    ).sort("created_at", 1).to_list(100)
    
    return {"comments": comments}


# ============= RATING ROUTES =============
@api_router.post("/ratings/create")
async def create_rating(
    request: RatingCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """Rate another user"""
    user = await get_current_user(authorization)
    
    if request.score < 1 or request.score > 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")
    
    # Check if already rated
    existing_rating = await db.ratings.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": request.to_user_id
    })
    
    if existing_rating:
        # Update existing rating
        await db.ratings.update_one(
            {
                "from_user_id": user["user_id"],
                "to_user_id": request.to_user_id
            },
            {"$set": {"score": request.score}}
        )
    else:
        # Create new rating
        rating = Rating(
            from_user_id=user["user_id"],
            to_user_id=request.to_user_id,
            score=request.score
        )
        await db.ratings.insert_one(rating.dict())
        
        # Update target user's rating stats
        await db.users.update_one(
            {"user_id": request.to_user_id},
            {
                "$inc": {
                    "total_ratings": 1,
                    "rating_sum": request.score
                }
            }
        )
    
    # Recalculate vibe score
    target_user = await db.users.find_one({"user_id": request.to_user_id}, {"_id": 0})
    if target_user and target_user.get("total_ratings", 0) > 0:
        new_vibe_score = target_user["rating_sum"] / target_user["total_ratings"]
        await db.users.update_one(
            {"user_id": request.to_user_id},
            {"$set": {"vibe_score": round(new_vibe_score, 2)}}
        )
    
    return {"message": "Rating submitted"}


# ============= ADMIN ROUTES =============
@api_router.get("/admin/verification-requests")
async def get_verification_requests(authorization: Optional[str] = Header(None)):
    """Get pending verification requests (admin only)"""
    await verify_admin(authorization)
    
    requests = await db.verification_requests.find(
        {"status": VerificationStatus.PENDING},
        {"_id": 0}
    ).to_list(100)
    
    return {"requests": requests}

@api_router.post("/admin/verification/{request_id}/approve")
async def approve_verification(
    request_id: str,
    authorization: Optional[str] = Header(None)
):
    """Approve verification request (admin only)"""
    admin_email = await verify_admin(authorization)
    
    # Update verification request
    result = await db.verification_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": VerificationStatus.VERIFIED,
            "reviewed_at": datetime.now(timezone.utc),
            "reviewed_by": admin_email
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get request to find user_id
    request_doc = await db.verification_requests.find_one({"request_id": request_id}, {"_id": 0})
    
    # Update user verification status
    await db.users.update_one(
        {"user_id": request_doc["user_id"]},
        {"$set": {"verification_status": VerificationStatus.VERIFIED}}
    )
    
    return {"message": "Verification approved"}

@api_router.post("/admin/verification/{request_id}/reject")
async def reject_verification(
    request_id: str,
    authorization: Optional[str] = Header(None)
):
    """Reject verification request (admin only)"""
    admin_email = await verify_admin(authorization)
    
    result = await db.verification_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": VerificationStatus.REJECTED,
            "reviewed_at": datetime.now(timezone.utc),
            "reviewed_by": admin_email
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get request to find user_id
    request_doc = await db.verification_requests.find_one({"request_id": request_id}, {"_id": 0})
    
    # Update user verification status
    await db.users.update_one(
        {"user_id": request_doc["user_id"]},
        {"$set": {"verification_status": VerificationStatus.REJECTED}}
    )
    
    return {"message": "Verification rejected"}


# ============= HEALTH CHECK =============
@api_router.get("/")
async def root():
    return {"message": "Off Campus API", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# ============= ADMIN AUTH ROUTES =============
class AdminLoginRequest(BaseModel):
    email: str
    password: str

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login with email and password"""
    if request.email != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(request.password.encode(), ADMIN_PASSWORD_HASH.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_admin_jwt()
    return {"access_token": token, "token_type": "bearer"}

@api_router.get("/admin/me")
async def admin_me(admin_email: str = None, authorization: Optional[str] = Header(None)):
    """Get current admin info"""
    admin = await verify_admin(authorization)
    return {"email": admin, "role": "admin"}

@api_router.get("/admin/stats")
async def admin_stats(authorization: Optional[str] = Header(None)):
    """Get platform statistics"""
    await verify_admin(authorization)
    
    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"verification_status": "verified"})
    pending_users = await db.users.count_documents({"verification_status": "pending"})
    premium_users = await db.users.count_documents({"is_premium": True})
    on_campus = await db.users.count_documents({"is_on_campus": True})
    total_confessions = await db.confessions.count_documents({})
    total_matches = await db.likes.count_documents({"is_match": True}) // 2
    total_colleges = await db.colleges.count_documents({})
    
    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "pending_verifications": pending_users,
        "premium_users": premium_users,
        "users_on_campus": on_campus,
        "total_confessions": total_confessions,
        "total_matches": total_matches,
        "total_colleges": total_colleges,
    }

@api_router.get("/admin/users")
async def admin_list_users(
    authorization: Optional[str] = Header(None),
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    """List all users (admin only)"""
    await verify_admin(authorization)
    
    query: Dict[str, Any] = {}
    if status:
        query["verification_status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    users = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"users": users, "count": len(users)}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Delete a user (admin only)"""
    await verify_admin(authorization)
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean up related data
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.likes.delete_many({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]})
    await db.verification_requests.delete_many({"user_id": user_id})
    
    return {"message": "User deleted"}

@api_router.post("/admin/users/{user_id}/grant-premium")
async def admin_grant_premium(
    user_id: str,
    days: int = 30,
    authorization: Optional[str] = Header(None)
):
    """Grant premium to a user (admin only)"""
    await verify_admin(authorization)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_premium = datetime.now(timezone.utc) + timedelta(days=days)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_premium": True, "premium_until": new_premium}}
    )
    return {"message": f"Premium granted for {days} days"}

@api_router.delete("/admin/confessions/{confession_id}")
async def admin_delete_confession(confession_id: str, authorization: Optional[str] = Header(None)):
    """Delete a confession (admin only)"""
    await verify_admin(authorization)
    
    result = await db.confessions.delete_one({"confession_id": confession_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Confession not found")
    
    await db.comments.delete_many({"confession_id": confession_id})
    return {"message": "Confession deleted"}


# ============= CHAT/MESSAGING ROUTES =============
class MessageCreateRequest(BaseModel):
    to_user_id: str
    content: str

@api_router.post("/messages/send")
async def send_message(
    request: MessageCreateRequest,
    authorization: Optional[str] = Header(None)
):
    """Send a message to another user (must be matched)"""
    user = await get_current_user(authorization)
    
    # Verify they are matched
    match = await db.likes.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": request.to_user_id,
        "is_match": True
    })
    if not match:
        raise HTTPException(status_code=403, detail="You can only message matches")
    
    # Create message
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "from_user_id": user["user_id"],
        "to_user_id": request.to_user_id,
        "content": request.content,
        "created_at": datetime.now(timezone.utc),
        "read": False,
    }
    await db.messages.insert_one(message)
    
    message.pop("_id", None)
    return {"message": message}

@api_router.get("/messages/conversations")
async def get_conversations(authorization: Optional[str] = Header(None)):
    """Get all conversations (list of matches with last message)"""
    user = await get_current_user(authorization)
    
    # Get all matches
    matches = await db.likes.find({
        "from_user_id": user["user_id"],
        "is_match": True
    }, {"_id": 0}).to_list(100)
    
    conversations = []
    for match in matches:
        other_user_id = match["to_user_id"]
        other_user = await db.users.find_one(
            {"user_id": other_user_id},
            {"_id": 0, "email": 0}
        )
        if not other_user:
            continue
        
        # Get last message
        last_msg = await db.messages.find_one(
            {
                "$or": [
                    {"from_user_id": user["user_id"], "to_user_id": other_user_id},
                    {"from_user_id": other_user_id, "to_user_id": user["user_id"]},
                ]
            },
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        unread_count = await db.messages.count_documents({
            "from_user_id": other_user_id,
            "to_user_id": user["user_id"],
            "read": False
        })
        
        conversations.append({
            "user": other_user,
            "last_message": last_msg,
            "unread_count": unread_count,
        })
    
    # Sort by last message time
    conversations.sort(
        key=lambda c: c["last_message"]["created_at"] if c["last_message"] else datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )
    
    return {"conversations": conversations}

@api_router.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get messages between current user and another user"""
    user = await get_current_user(authorization)
    
    messages = await db.messages.find({
        "$or": [
            {"from_user_id": user["user_id"], "to_user_id": other_user_id},
            {"from_user_id": other_user_id, "to_user_id": user["user_id"]},
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Mark received messages as read
    await db.messages.update_many(
        {"from_user_id": other_user_id, "to_user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    
    return {"messages": messages}


# ============= REFERRAL ROUTES =============
@api_router.get("/referrals/my-stats")
async def my_referral_stats(authorization: Optional[str] = Header(None)):
    """Get current user's referral stats"""
    user = await get_current_user(authorization)
    
    # Generate code if user doesn't have one
    if not user.get("referral_code"):
        code = generate_referral_code(user["name"])
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"referral_code": code}}
        )
        user["referral_code"] = code
    
    # Get referred users
    referred = await db.users.find(
        {"referred_by": user["user_id"]},
        {"_id": 0, "name": 1, "college_id": 1, "created_at": 1}
    ).to_list(100)
    
    premium_until = user.get("premium_until")
    days_remaining = 0
    if premium_until:
        if isinstance(premium_until, datetime):
            if premium_until.tzinfo is None:
                premium_until = premium_until.replace(tzinfo=timezone.utc)
            delta = premium_until - datetime.now(timezone.utc)
            days_remaining = max(0, delta.days)
    
    return {
        "referral_code": user["referral_code"],
        "referral_count": user.get("referral_count", 0),
        "referred_users": referred,
        "premium_days_remaining": days_remaining,
        "rewards_earned_days": user.get("referral_count", 0) * 7,
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db():
    """Initialize database with indexes and seed data"""
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.colleges.create_index("college_id", unique=True)
    await db.likes.create_index([("from_user_id", 1), ("to_user_id", 1)])
    await db.confessions.create_index("created_at")
    await db.ratings.create_index([("from_user_id", 1), ("to_user_id", 1)])
    
    # Seed colleges if empty
    college_count = await db.colleges.count_documents({})
    if college_count == 0:
        await seed_colleges()
        logger.info("Seeded college data")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


async def seed_colleges():
    """Seed database with Delhi colleges"""
    colleges_data = [
        # Delhi University Colleges
        {"name": "St. Stephen's College", "short_name": "Stephens", "location": "University Enclave, Delhi", 
         "latitude": 28.6906, "longitude": 77.2160, "email_domains": ["ststephens.edu"], "type": "college"},
        {"name": "Hindu College", "short_name": "Hindu", "location": "University Enclave, Delhi",
         "latitude": 28.6912, "longitude": 77.2143, "email_domains": ["hinducollege.ac.in"], "type": "college"},
        {"name": "Miranda House", "short_name": "Miranda", "location": "Chhatra Marg, Delhi",
         "latitude": 28.7041, "longitude": 77.2013, "email_domains": ["mirandahouse.ac.in"], "type": "college"},
        {"name": "Lady Shri Ram College", "short_name": "LSR", "location": "Lajpat Nagar, Delhi",
         "latitude": 28.5678, "longitude": 77.2430, "email_domains": ["lsr.edu.in"], "type": "college"},
        {"name": "Hansraj College", "short_name": "Hansraj", "location": "Malka Ganj, Delhi",
         "latitude": 28.6889, "longitude": 77.2145, "email_domains": ["hansrajcollege.ac.in"], "type": "college"},
        {"name": "Ramjas College", "short_name": "Ramjas", "location": "University Enclave, Delhi",
         "latitude": 28.6897, "longitude": 77.2150, "email_domains": ["ramjas.du.ac.in"], "type": "college"},
        {"name": "Sri Venkateswara College", "short_name": "Venky", "location": "Dhaula Kuan, Delhi",
         "latitude": 28.5989, "longitude": 77.1621, "email_domains": ["svc.ac.in"], "type": "college"},
        {"name": "Kirori Mal College", "short_name": "KMC", "location": "University Enclave, Delhi",
         "latitude": 28.6899, "longitude": 77.2154, "email_domains": ["kmc.du.ac.in"], "type": "college"},
        
        # IPU Colleges
        {"name": "Guru Gobind Singh Indraprastha University", "short_name": "IPU", "location": "Dwarka, Delhi",
         "latitude": 28.6049, "longitude": 77.0390, "email_domains": ["ipu.ac.in"], "type": "university"},
        {"name": "Maharaja Agrasen Institute of Technology", "short_name": "MAIT", "location": "Rohini, Delhi",
         "latitude": 28.7337, "longitude": 77.0907, "email_domains": ["mait.ac.in"], "type": "college"},
        {"name": "Netaji Subhas University of Technology", "short_name": "NSUT", "location": "Dwarka, Delhi",
         "latitude": 28.6103, "longitude": 77.0380, "email_domains": ["nsut.ac.in"], "type": "university"},
        {"name": "Bharati Vidyapeeth's College of Engineering", "short_name": "BVCOE", "location": "Paschim Vihar, Delhi",
         "latitude": 28.6711, "longitude": 77.1025, "email_domains": ["bvcoend.ac.in"], "type": "college"},
        {"name": "Vivekananda Institute of Professional Studies", "short_name": "VIPS", "location": "Pitampura, Delhi",
         "latitude": 28.6961, "longitude": 77.1370, "email_domains": ["vips.edu"], "type": "institute"},
        
        # Other prominent Delhi institutions
        {"name": "Indian Institute of Technology Delhi", "short_name": "IIT Delhi", "location": "Hauz Khas, Delhi",
         "latitude": 28.5449, "longitude": 77.1927, "email_domains": ["iitd.ac.in"], "type": "institute"},
        {"name": "Jawaharlal Nehru University", "short_name": "JNU", "location": "New Mehrauli Road, Delhi",
         "latitude": 28.5420, "longitude": 77.1669, "email_domains": ["jnu.ac.in"], "type": "university"},
        {"name": "Jamia Millia Islamia", "short_name": "Jamia", "location": "Jamia Nagar, Delhi",
         "latitude": 28.5611, "longitude": 77.2826, "email_domains": ["jmi.ac.in"], "type": "university"},
        {"name": "Ambedkar University Delhi", "short_name": "AUD", "location": "Kashmere Gate, Delhi",
         "latitude": 28.6680, "longitude": 77.2270, "email_domains": ["aud.ac.in"], "type": "university"},
        {"name": "Delhi Technological University", "short_name": "DTU", "location": "Shahbad Daulatpur, Delhi",
         "latitude": 28.7497, "longitude": 77.1174, "email_domains": ["dtu.ac.in"], "type": "university"},
        {"name": "Indira Gandhi Delhi Technical University for Women", "short_name": "IGDTUW", "location": "Kashmere Gate, Delhi",
         "latitude": 28.6662, "longitude": 77.2272, "email_domains": ["igdtuw.ac.in"], "type": "university"},
    ]
    
    colleges = [College(**college_data) for college_data in colleges_data]
    await db.colleges.insert_many([college.dict() for college in colleges])
    
    # Create some dummy verified users for demo
    dummy_users_data = [
        {
            "name": "Aarav Sharma", "age": 21, "gender": "male", "college_id": colleges[0].college_id,
            "year": "3rd Year", "course": "Economics", "bio": "Love coffee and deep conversations ☕",
            "interests": ["Music", "Travel", "Photography"], "looking_for": "dating",
            "photos": ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzRBOTBFMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
            "vibe_score": 4.5, "verification_status": "verified",
            "spotify_data": {"top_tracks": ["Blinding Lights", "Levitating", "Good 4 U"], "top_artists": ["The Weeknd", "Dua Lipa", "Olivia Rodrigo"]}
        },
        {
            "name": "Priya Singh", "age": 20, "gender": "female", "college_id": colleges[3].college_id,
            "year": "2nd Year", "course": "Psychology", "bio": "Bookworm and art enthusiast 🎨📚",
            "interests": ["Reading", "Art", "Yoga"], "looking_for": "friends",
            "photos": ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0U5MUU2MyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlA8L3RleHQ+PC9zdmc+"],
            "vibe_score": 4.8, "verification_status": "verified",
            "spotify_data": {"top_tracks": ["drivers license", "traitor", "deja vu"], "top_artists": ["Olivia Rodrigo", "Taylor Swift", "Conan Gray"]}
        },
        {
            "name": "Rohan Mehta", "age": 22, "gender": "male", "college_id": colleges[9].college_id,
            "year": "4th Year", "course": "Computer Science", "bio": "Tech geek | Gamer | Meme lord 🎮",
            "interests": ["Gaming", "Coding", "Anime"], "looking_for": "all",
            "photos": ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFFODhFNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlI8L3RleHQ+PC9zdmc+"],
            "vibe_score": 4.2, "verification_status": "verified",
            "spotify_data": {"top_tracks": ["Heat Waves", "Stay", "Ghost"], "top_artists": ["Glass Animals", "The Kid LAROI", "Justin Bieber"]}
        },
        {
            "name": "Ananya Kapoor", "age": 19, "gender": "female", "college_id": colleges[2].college_id,
            "year": "1st Year", "course": "English Literature", "bio": "Poet | Dreamer | Coffee addict ☕✨",
            "interests": ["Poetry", "Writing", "Dance"], "looking_for": "dating",
            "photos": ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNTczMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
            "vibe_score": 4.6, "verification_status": "verified",
            "spotify_data": {"top_tracks": ["Wildest Dreams", "Cardigan", "August"], "top_artists": ["Taylor Swift", "Lorde", "Lana Del Rey"]}
        },
        {
            "name": "Kabir Malhotra", "age": 23, "gender": "male", "college_id": colleges[13].college_id,
            "year": "Final Year", "course": "Mechanical Engineering", "bio": "Gym rat 💪 | Fitness freak | Adventure junkie",
            "interests": ["Fitness", "Trekking", "Sports"], "looking_for": "friends",
            "photos": ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI4QTc0NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
            "vibe_score": 4.4, "verification_status": "verified",
            "spotify_data": {"top_tracks": ["Starboy", "Believer", "Thunder"], "top_artists": ["The Weeknd", "Imagine Dragons", "Post Malone"]}
        }
    ]
    
    for user_data in dummy_users_data:
        user = User(
            user_id=f"user_{uuid.uuid4().hex[:12]}",
            email=f"{user_data['name'].lower().replace(' ', '.')}@example.com",
            **user_data
        )
        await db.users.insert_one(user.dict())
