const { connectDB, sequelize } = require('../config/db');
const { User, Like, Confession, Comment, Story, Event, Message } = require('../models');
const { generateReferralCode } = require('./geo');
const crypto = require('crypto');

const stephensDummies = [
  {
    name: "Ishaan Malhotra", age: 21, gender: "male", college_id: 'col_stephens',
    year: "3rd Year", course: "Chemistry", bio: "Always down for some live music and good food 🎸🍕",
    interests: ["Music", "Food", "Guitar", "Trekking"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNGNTRCMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkk8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.3, verification_status: "verified",
    spotify_data: { top_tracks: ["Night Changes", "Perfect"], top_artists: ["One Direction", "Ed Sheeran"] }
  },
  {
    name: "Diya Sen", age: 20, gender: "female", college_id: 'col_stephens',
    year: "2nd Year", course: "History", bio: "Chai over coffee, novels over movies ☕📖",
    interests: ["Reading", "Writing", "Travel", "Museums"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzk5MDBGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkQ8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.7, verification_status: "verified",
    spotify_data: { top_tracks: ["Cardigan", "Blank Space"], top_artists: ["Taylor Swift", "Lana Del Rey"] }
  },
  {
    name: "Kabir Kapoor", age: 22, gender: "male", college_id: 'col_stephens',
    year: "4th Year", course: "Economics", bio: "Football fan and amateur chef. Let's debate about sports! ⚽👨‍🍳",
    interests: ["Sports", "Cooking", "Fitness", "Gaming"], looking_for: "all",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM0NDk1RSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.1, verification_status: "verified",
    spotify_data: { top_tracks: ["Believer", "Natural"], top_artists: ["Imagine Dragons"] }
  },
  {
    name: "Riya Sharma", age: 19, gender: "female", college_id: 'col_stephens',
    year: "1st Year", course: "Philosophy", bio: "Dreamer, coffee lover, and occasional painter 🎨☕",
    interests: ["Art", "Coffee", "Yoga", "Poetry"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNDQ0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlI8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.6, verification_status: "verified",
    spotify_data: { top_tracks: ["Good 4 U", "Deja Vu"], top_artists: ["Olivia Rodrigo"] }
  },
  {
    name: "Dev Bajaj", age: 21, gender: "male", college_id: 'col_stephens',
    year: "3rd Year", course: "Mathematics", bio: "CS geek | Gamer | Let's play some Valorant or COD 🎮💻",
    interests: ["Gaming", "Coding", "Anime", "Movies"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzBDODZDOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkQ8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.2, verification_status: "verified",
    spotify_data: { top_tracks: ["Starboy", "The Hills"], top_artists: ["The Weeknd"] }
  },
  {
    name: "Meera Roy", age: 20, gender: "female", college_id: 'col_stephens',
    year: "2nd Year", course: "English Literature", bio: "Poetry, vintage aesthetics, and museum dates 🏛️📜",
    interests: ["Poetry", "Museums", "Photography", "Reading"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0UxODBDRCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk08L3RleHQ+PC9zdmc+"],
    vibe_score: 4.8, verification_status: "verified",
    spotify_data: { top_tracks: ["Summertime Sadness", "Video Games"], top_artists: ["Lana Del Rey"] }
  },
  {
    name: "Rohan Verma", age: 22, gender: "male", college_id: 'col_stephens',
    year: "4th Year", course: "Physics", bio: "Star gazer and trekker. Let's go to the mountains! 🏔️✨",
    interests: ["Trekking", "Stars", "Nature", "Photography"], looking_for: "all",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzJDM0U1MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlI8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.4, verification_status: "verified",
    spotify_data: { top_tracks: ["Heat Waves", "Youth"], top_artists: ["Glass Animals", "Troye Sivan"] }
  },
  {
    name: "Kiara Gupta", age: 21, gender: "female", college_id: 'col_stephens',
    year: "3rd Year", course: "Economics", bio: "Dancing is my therapy. Looking for good vibes only 💃✨",
    interests: ["Dance", "Fashion", "Music", "Fitness"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNUM3MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.5, verification_status: "verified",
    spotify_data: { top_tracks: ["Levitating", "Don't Start Now"], top_artists: ["Dua Lipa"] }
  },
  {
    name: "Arjun Singhal", age: 20, gender: "male", college_id: 'col_stephens',
    year: "2nd Year", course: "Commerce", bio: "Fitness enthusiast and music producer. Let's collab! 🎧💪",
    interests: ["Fitness", "DJing", "Gym", "Music"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI3QUUxRCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.3, verification_status: "verified",
    spotify_data: { top_tracks: ["Wake Me Up", "Levels"], top_artists: ["Avicii"] }
  },
  {
    name: "Sneha Joshi", age: 20, gender: "female", college_id: 'col_stephens',
    year: "2nd Year", course: "Psychology", bio: "Mindfulness and mental health advocate. Let's chat about life 🧘‍♀️💫",
    interests: ["Yoga", "Psychology", "Meditation", "Reading"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0UxNUE4NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlM8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.9, verification_status: "verified",
    spotify_data: { top_tracks: ["Stay", "Love Yourself"], top_artists: ["Justin Bieber"] }
  }
];

const otherCollegesDummies = [
  {
    name: "Kabir Gill", age: 21, gender: "male", college_id: 'col_hindu',
    year: "3rd Year", course: "History", bio: "Debater, history buff, and tea lover ☕",
    interests: ["Debating", "Books", "Travel", "History"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQ2ODJDQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.4, verification_status: "verified",
    spotify_data: { top_tracks: ["Blinding Lights", "Save Your Tears"], top_artists: ["The Weeknd"] }
  },
  {
    name: "Nisha Patel", age: 20, gender: "female", college_id: 'col_miranda',
    year: "2nd Year", course: "Geography", bio: "Mapping out my life, one cup of coffee at a time 🗺️☕",
    interests: ["Reading", "Anime", "Coffee", "Sketching"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0UxNUE4NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk48L3RleHQ+PC9zdmc+"],
    vibe_score: 4.5, verification_status: "verified",
    spotify_data: { top_tracks: ["Drivers License", "Deja Vu"], top_artists: ["Olivia Rodrigo"] }
  },
  {
    name: "Ryan Fernandes", age: 22, gender: "male", college_id: 'col_nsut',
    year: "4th Year", course: "ECE", bio: "Making beats and coding apps 🎧💻",
    interests: ["DJing", "Coding", "Music", "Tech"], looking_for: "all",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzEyMTAxMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlI8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.2, verification_status: "verified",
    spotify_data: { top_tracks: ["Starboy", "Stargirl Interlude"], top_artists: ["The Weeknd", "Lana Del Rey"] }
  },
  {
    name: "Alisha Chawla", age: 19, gender: "female", college_id: 'col_hansraj',
    year: "1st Year", course: "B.Com", bio: "Vibing to pop music and looking for shopping partners 🛍️🎵",
    interests: ["Shopping", "Fashion", "Singing", "Dance"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNUM3MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.6, verification_status: "verified",
    spotify_data: { top_tracks: ["Levitating", "Physical"], top_artists: ["Dua Lipa"] }
  },
  {
    name: "Samir Deshmukh", age: 21, gender: "male", college_id: 'col_dtu',
    year: "3rd Year", course: "Software Engineering", bio: "Building rockets and coding hacks. Let's play chess! 🚀♟️",
    interests: ["Chess", "Coding", "Gaming", "Robotics"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM0NDk1RSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlM8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.3, verification_status: "verified",
    spotify_data: { top_tracks: ["Stay", "Love Yourself"], top_artists: ["Justin Bieber"] }
  },
  {
    name: "Tanya Sen", age: 22, gender: "female", college_id: 'col_jnu',
    year: "Postgrad", course: "International Relations", bio: "Political analyst by day, stargazer by night 🌌📚",
    interests: ["Politics", "Stargazing", "Nature", "Books"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzJDM0U1MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlQ8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.8, verification_status: "verified",
    spotify_data: { top_tracks: ["Summertime Sadness", "Young and Beautiful"], top_artists: ["Lana Del Rey"] }
  },
  {
    name: "Vikram Rathore", age: 23, gender: "male", college_id: 'col_vips',
    year: "4th Year", course: "Law", bio: "Lawyer in the making. Fit lifestyle, gym rat 💪🏋️",
    interests: ["Gym", "Law", "Fitness", "Running"], looking_for: "all",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI3QUUxRCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlY8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.1, verification_status: "verified",
    spotify_data: { top_tracks: ["Believer", "Thunder"], top_artists: ["Imagine Dragons"] }
  },
  {
    name: "Kavya Nair", age: 20, gender: "female", college_id: 'col_venky',
    year: "2nd Year", course: "Zoology", bio: "Animal lover and pet photographer 🐶📸",
    interests: ["Animals", "Photography", "Music", "Art"], looking_for: "friends",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNDOEQ5RiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.7, verification_status: "verified",
    spotify_data: { top_tracks: ["Night Changes", "Perfect"], top_artists: ["One Direction", "Ed Sheeran"] }
  },
  {
    name: "Yash Vardhan", age: 21, gender: "male", college_id: 'col_ipu',
    year: "3rd Year", course: "BBA", bio: "Startup enthusiast and crypto trader. Let's talk business 📈💰",
    interests: ["Finance", "Podcasts", "Golf", "Networking"], looking_for: "all",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNGNTRCMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlk8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.4, verification_status: "verified",
    spotify_data: { top_tracks: ["Wake Me Up", "Levels"], top_artists: ["Avicii"] }
  },
  {
    name: "Aanya Singhal", age: 21, gender: "female", college_id: 'col_igdtuw',
    year: "3rd Year", course: "Computer Science", bio: "Coding with coffee and dancing in the rain 💃💻",
    interests: ["Coding", "Dance", "Writing", "Anime"], looking_for: "dating",
    photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzk5MDBGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
    vibe_score: 4.9, verification_status: "verified",
    spotify_data: { top_tracks: ["Cardigan", "Blank Space"], top_artists: ["Taylor Swift"] }
  }
];

const runDemoSeeder = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    // 1. Find the logged-in user (the user whose email does not end with @example.com, @stephens-dummy.com, or @othercollege-dummy.com)
    const users = await User.findAll();
    const user = users.find(u => 
      !u.email.endsWith('@example.com') && 
      !u.email.endsWith('@stephens-dummy.com') &&
      !u.email.endsWith('@othercollege-dummy.com')
    );

    if (!user) {
      console.log('No logged-in user found. Please log in on the app via Google first so we can find your profile!');
      return;
    }

    console.log(`Found logged-in user: ${user.name} (${user.email})`);

    // 2. Upgrade user to verified & premium, and set their college to St. Stephen's
    user.verification_status = 'verified';
    user.is_premium = true;
    user.college_id = 'col_stephens';
    user.premium_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await user.save();
    console.log('Upgraded user profile to VERIFIED and PREMIUM (St. Stephen\'s College).');

    // 3. Clear and insert 10 St. Stephen's dummy users
    console.log('Clearing old St. Stephen\'s dummy users...');
    await User.destroy({
      where: {
        email: {
          [sequelize.Sequelize.Op.like]: '%@stephens-dummy.com'
        }
      }
    });

    const malePhotos = [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80"
    ];

    const femalePhotos = [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80"
    ];

    let mIdx = 0;
    let fIdx = 0;

    console.log('Seeding 10 dummy users for St. Stephen\'s College...');
    for (const d of stephensDummies) {
      const dummyId = `user_dummy_${crypto.randomBytes(6).toString('hex')}`;
      const dummyEmail = `${d.name.toLowerCase().replace(/\s+/g, '.')}@stephens-dummy.com`;
      const refCode = generateReferralCode(d.name);

      const userPhotos = d.gender === 'male' 
        ? [malePhotos[mIdx++ % malePhotos.length]] 
        : [femalePhotos[fIdx++ % femalePhotos.length]];

      await User.create({
        ...d,
        user_id: dummyId,
        email: dummyEmail,
        referral_code: refCode,
        photos: userPhotos
      });
    }
    console.log('Seeded 10 dummy users successfully!');

    // 3.5 Clear and insert 10 Other College dummy users
    console.log('Clearing old other-college dummy users...');
    await User.destroy({
      where: {
        email: {
          [sequelize.Sequelize.Op.like]: '%@othercollege-dummy.com'
        }
      }
    });

    console.log('Seeding 10 dummy users for other colleges...');
    for (const d of otherCollegesDummies) {
      const dummyId = `user_dummy_other_${crypto.randomBytes(6).toString('hex')}`;
      const dummyEmail = `${d.name.toLowerCase().replace(/\s+/g, '.')}@othercollege-dummy.com`;
      const refCode = generateReferralCode(d.name);

      const userPhotos = d.gender === 'male' 
        ? [malePhotos[mIdx++ % malePhotos.length]] 
        : [femalePhotos[fIdx++ % femalePhotos.length]];

      await User.create({
        ...d,
        user_id: dummyId,
        email: dummyEmail,
        referral_code: refCode,
        photos: userPhotos
      });
    }
    console.log('Seeded 10 other college dummy users successfully!');

    // 4. Find Aarav and Priya (our dummy users)
    const aarav = await User.findOne({ where: { name: 'Aarav Sharma' } });
    const priya = await User.findOne({ where: { name: 'Priya Singh' } });

    if (aarav && priya) {
      // Clean old likes with them
      await Like.destroy({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { from_user_id: user.user_id, to_user_id: [aarav.user_id, priya.user_id] },
            { from_user_id: [aarav.user_id, priya.user_id], to_user_id: user.user_id }
          ]
        }
      });

      // Create mutual match with Aarav
      await Like.create({
        like_id: `like_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: user.user_id,
        to_user_id: aarav.user_id,
        is_match: true
      });
      await Like.create({
        like_id: `like_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: aarav.user_id,
        to_user_id: user.user_id,
        is_match: true
      });

      // Create mutual match with Priya
      await Like.create({
        like_id: `like_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: user.user_id,
        to_user_id: priya.user_id,
        is_match: true
      });
      await Like.create({
        like_id: `like_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: priya.user_id,
        to_user_id: user.user_id,
        is_match: true
      });

      console.log('Created mutual matches (matches) with Aarav Sharma and Priya Singh.');

      // 5. Create some default chat messages to show in conversations tab
      await Message.destroy({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { from_user_id: user.user_id, to_user_id: [aarav.user_id, priya.user_id] },
            { from_user_id: [aarav.user_id, priya.user_id], to_user_id: user.user_id }
          ]
        }
      });

      await Message.create({
        message_id: `msg_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: aarav.user_id,
        to_user_id: user.user_id,
        content: "Hey! Nice profile. Do you want to grab coffee at Stephens canteen later? ☕",
        read: false
      });

      await Message.create({
        message_id: `msg_${crypto.randomBytes(6).toString('hex')}`,
        from_user_id: priya.user_id,
        to_user_id: user.user_id,
        content: "Hey there! I saw you are interested in photography too. What camera do you use? 📸",
        read: false
      });

      console.log('Seeded initial chat messages from Aarav and Priya.');
    }

    // 6. Seed confessions feed
    await Comment.destroy({ where: {} });
    await Confession.destroy({ where: {} });

    const conf1 = await Confession.create({
      confession_id: `conf_${crypto.randomBytes(6).toString('hex')}`,
      user_id: aarav ? aarav.user_id : 'system',
      college_id: 'col_stephens',
      content: "Anyone else completely unprepared for the internal exams next week? Stephens library is packed 😭",
      likes: 12,
      comments: 2
    });

    const conf2 = await Confession.create({
      confession_id: `conf_${crypto.randomBytes(6).toString('hex')}`,
      user_id: priya ? priya.user_id : 'system',
      college_id: null, // General
      content: "Met someone really cute in the metro today wearing a red hoodie. If you study at DU, please reply!",
      likes: 34,
      comments: 0
    });

    await Comment.create({
      comment_id: `cmt_${crypto.randomBytes(6).toString('hex')}`,
      confession_id: conf1.confession_id,
      user_id: priya ? priya.user_id : 'system',
      content: "Same here... I have read zero chapters for psychology."
    });

    console.log('Seeded confessions feed entries.');

    // 7. Seed active stories
    await Story.destroy({ where: {} });
    if (priya) {
      await Story.create({
        story_id: `story_${crypto.randomBytes(6).toString('hex')}`,
        user_id: priya.user_id,
        user_name: priya.name,
        user_picture: priya.photos[0],
        college_id: priya.college_id,
        image: priya.photos[0],
        caption: "Sunny day at LSR campus 🌸",
        views: [],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      console.log('Seeded active 24-hour story from Priya.');
    }

    // 8. Seed active fests/events
    await Event.destroy({ where: {} });
    await Event.create({
      event_id: `event_${crypto.randomBytes(6).toString('hex')}`,
      title: "Stephens Winter Fest 2026",
      description: "Get ready for the biggest winter fest in North Campus! Live bands, food stalls, and interactive games.",
      college_id: "col_stephens",
      location: "Main Lawn, St. Stephen's College",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      category: "fest",
      host_user_id: aarav ? aarav.user_id : 'system',
      host_name: aarav ? aarav.name : 'St. Stephens',
      attendees: aarav ? [aarav.user_id] : [],
      attendee_count: 1
    });
    console.log('Seeded upcoming campus fest event.');

    console.log('========================================================');
    console.log('  Demo seeder completed! Open the app to see the data!');
    console.log('========================================================');

  } catch (err) {
    console.error('Failed to run demo seeder:', err);
  } finally {
    process.exit(0);
  }
};

runDemoSeeder();
