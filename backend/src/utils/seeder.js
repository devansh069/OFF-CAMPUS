const crypto = require('crypto');
const { connectDB, sequelize } = require('../config/db');
const { College, User } = require('../models');
const { generateReferralCode } = require('./geo');

const collegesData = [
  // Delhi University Colleges
  { college_id: 'col_stephens', name: "St. Stephen's College", short_name: "Stephens", location: "University Enclave, Delhi", latitude: 28.6906, longitude: 77.2160, email_domains: ["ststephens.edu"], type: "college" },
  { college_id: 'col_hindu', name: "Hindu College", short_name: "Hindu", location: "University Enclave, Delhi", latitude: 28.6912, longitude: 77.2143, email_domains: ["hinducollege.ac.in"], type: "college" },
  { college_id: 'col_miranda', name: "Miranda House", short_name: "Miranda", location: "Chhatra Marg, Delhi", latitude: 28.7041, longitude: 77.2013, email_domains: ["mirandahouse.ac.in"], type: "college" },
  { college_id: 'col_lsr', name: "Lady Shri Ram College", short_name: "LSR", location: "Lajpat Nagar, Delhi", latitude: 28.5678, longitude: 77.2430, email_domains: ["lsr.edu.in"], type: "college" },
  { college_id: 'col_hansraj', name: "Hansraj College", short_name: "Hansraj", location: "Malka Ganj, Delhi", latitude: 28.6889, longitude: 77.2145, email_domains: ["hansrajcollege.ac.in"], type: "college" },
  { college_id: 'col_ramjas', name: "Ramjas College", short_name: "Ramjas", location: "University Enclave, Delhi", latitude: 28.6897, longitude: 77.2150, email_domains: ["ramjas.du.ac.in"], type: "college" },
  { college_id: 'col_venky', name: "Sri Venkateswara College", short_name: "Venky", location: "Dhaula Kuan, Delhi", latitude: 28.5989, longitude: 77.1621, email_domains: ["svc.ac.in"], type: "college" },
  { college_id: 'col_kmc', name: "Kirori Mal College", short_name: "KMC", location: "University Enclave, Delhi", latitude: 28.6899, longitude: 77.2154, email_domains: ["kmc.du.ac.in"], type: "college" },
  
  // IPU Colleges
  { college_id: 'col_ipu', name: "Guru Gobind Singh Indraprastha University", short_name: "IPU", location: "Dwarka, Delhi", latitude: 28.6049, longitude: 77.0390, email_domains: ["ipu.ac.in"], type: "university" },
  { college_id: 'col_mait', name: "Maharaja Agrasen Institute of Technology", short_name: "MAIT", location: "Rohini, Delhi", latitude: 28.7337, longitude: 77.0907, email_domains: ["mait.ac.in"], type: "college" },
  { college_id: 'col_nsut', name: "Netaji Subhas University of Technology", short_name: "NSUT", location: "Dwarka, Delhi", latitude: 28.6103, longitude: 77.0380, email_domains: ["nsut.ac.in"], type: "university" },
  { college_id: 'col_bvcoe', name: "Bharati Vidyapeeth's College of Engineering", short_name: "BVCOE", location: "Paschim Vihar, Delhi", latitude: 28.6711, longitude: 77.1025, email_domains: ["bvcoend.ac.in"], type: "college" },
  { college_id: 'col_vips', name: "Vivekananda Institute of Professional Studies", short_name: "VIPS", location: "Pitampura, Delhi", latitude: 28.6961, longitude: 77.1370, email_domains: ["vips.edu"], type: "institute" },
  
  // Other prominent Delhi institutions
  { college_id: 'col_iitd', name: "Indian Institute of Technology Delhi", short_name: "IIT Delhi", location: "Hauz Khas, Delhi", latitude: 28.5449, longitude: 77.1927, email_domains: ["iitd.ac.in"], type: "institute" },
  { college_id: 'col_jnu', name: "Jawaharlal Nehru University", short_name: "JNU", location: "New Mehrauli Road, Delhi", latitude: 28.5420, longitude: 77.1669, email_domains: ["jnu.ac.in"], type: "university" },
  { college_id: 'col_jamia', name: "Jamia Millia Islamia", short_name: "Jamia", location: "Jamia Nagar, Delhi", latitude: 28.5611, longitude: 77.2826, email_domains: ["jmi.ac.in"], type: "university" },
  { college_id: 'col_aud', name: "Ambedkar University Delhi", short_name: "AUD", location: "Kashmere Gate, Delhi", latitude: 28.6680, longitude: 77.2270, email_domains: ["aud.ac.in"], type: "university" },
  { college_id: 'col_dtu', name: "Delhi Technological University", short_name: "DTU", location: "Shahbad Daulatpur, Delhi", latitude: 28.7497, longitude: 77.1174, email_domains: ["dtu.ac.in"], type: "university" },
  { college_id: 'col_igdtuw', name: "Indira Gandhi Delhi Technical University for Women", short_name: "IGDTUW", location: "Kashmere Gate, Delhi", latitude: 28.6662, longitude: 77.2272, email_domains: ["igdtuw.ac.in"], type: "university" }
];

const seedDatabase = async () => {
  try {
    console.log('Seeding database colleges...');
    
    // Seed colleges
    for (const col of collegesData) {
      await College.findOrCreate({
        where: { college_id: col.college_id },
        defaults: col
      });
    }
    console.log('Colleges seeded successfully!');

    // Seed dummy users if users table is empty
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Seeding dummy verified users...');
      
      const dummyUsersData = [
        {
          name: "Aarav Sharma", age: 21, gender: "male", college_id: 'col_stephens',
          year: "3rd Year", course: "Economics", bio: "Love coffee and deep conversations ☕",
          interests: ["Music", "Travel", "Photography"], looking_for: "dating",
          photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzRBOTBFMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
          vibe_score: 4.5, verification_status: "verified",
          spotify_data: { top_tracks: ["Blinding Lights", "Levitating", "Good 4 U"], top_artists: ["The Weeknd", "Dua Lipa", "Olivia Rodrigo"] }
        },
        {
          name: "Priya Singh", age: 20, gender: "female", college_id: 'col_lsr',
          year: "2nd Year", course: "Psychology", bio: "Bookworm and art enthusiast 🎨📚",
          interests: ["Reading", "Art", "Yoga"], looking_for: "friends",
          photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0U5MUU2MyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlA8L3RleHQ+PC9zdmc+"],
          vibe_score: 4.8, verification_status: "verified",
          spotify_data: { top_tracks: ["drivers license", "traitor", "deja vu"], top_artists: ["Olivia Rodrigo", "Taylor Swift", "Conan Gray"] }
        },
        {
          name: "Rohan Mehta", age: 22, gender: "male", college_id: 'col_mait',
          year: "4th Year", course: "Computer Science", bio: "Tech geek | Gamer | Meme lord 🎮",
          interests: ["Gaming", "Coding", "Anime"], looking_for: "all",
          photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFFODhFNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlI8L3RleHQ+PC9zdmc+"],
          vibe_score: 4.2, verification_status: "verified",
          spotify_data: { top_tracks: ["Heat Waves", "Stay", "Ghost"], top_artists: ["Glass Animals", "The Kid LAROI", "Justin Bieber"] }
        },
        {
          name: "Ananya Kapoor", age: 19, gender: "female", college_id: 'col_miranda',
          year: "1st Year", course: "English Literature", bio: "Poet | Dreamer | Coffee addict ☕✨",
          interests: ["Poetry", "Writing", "Dance"], looking_for: "dating",
          photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNTczMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkE8L3RleHQ+PC9zdmc+"],
          vibe_score: 4.6, verification_status: "verified",
          spotify_data: { top_tracks: ["Wildest Dreams", "Cardigan", "August"], top_artists: ["Taylor Swift", "Lorde", "Lana Del Rey"] }
        },
        {
          name: "Kabir Malhotra", age: 23, gender: "male", college_id: 'col_iitd',
          year: "Final Year", course: "Mechanical Engineering", bio: "Gym rat 💪 | Fitness freak | Adventure junkie",
          interests: ["Fitness", "Trekking", "Sports"], looking_for: "friends",
          photos: ["data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI4QTc0NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjYwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPks8L3RleHQ+PC9zdmc+"],
          vibe_score: 4.4, verification_status: "verified",
          spotify_data: { top_tracks: ["Starboy", "Believer", "Thunder"], top_artists: ["The Weeknd", "Imagine Dragons", "Post Malone"] }
        }
      ];

      for (const u of dummyUsersData) {
        const userId = `user_${crypto.randomBytes(6).toString('hex')}`;
        const userEmail = `${u.name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        const refCode = generateReferralCode(u.name);

        await User.create({
          user_id: userId,
          email: userEmail,
          referral_code: refCode,
          ...u
        });
      }
      console.log('Dummy verified users seeded successfully!');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

// If run directly from console, connect to DB first and then seed
if (require.main === module) {
  const runSeeder = async () => {
    await connectDB();
    await sequelize.sync();
    await seedDatabase();
    process.exit(0);
  };
  runSeeder();
}

module.exports = { seedDatabase };
