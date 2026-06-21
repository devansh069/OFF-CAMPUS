const College = require('../models/College');

const defaultColleges = [
  {
    college_id: 'col_stephens',
    name: 'St. Stephen\'s College',
    short_name: 'SSC',
    location: 'North Campus, University Enclave, Delhi',
    latitude: 28.6874,
    longitude: 77.2132,
    email_domains: ['stephens.edu', 'ststephens.edu'],
    type: 'Delhi University',
    city: 'Delhi'
  },
  {
    college_id: 'col_hindu',
    name: 'Hindu College',
    short_name: 'HC',
    location: 'North Campus, University Enclave, Delhi',
    latitude: 28.6896,
    longitude: 77.2105,
    email_domains: ['hinducollege.ac.in'],
    type: 'Delhi University',
    city: 'Delhi'
  },
  {
    college_id: 'col_dtu',
    name: 'Delhi Technological University',
    short_name: 'DTU',
    location: 'Shahbad Daulatpur, Main Bawana Road, Delhi',
    latitude: 28.7501,
    longitude: 77.1177,
    email_domains: ['dtu.ac.in'],
    type: 'Technical University',
    city: 'Delhi'
  },
  {
    college_id: 'col_nsut',
    name: 'Netaji Subhas University of Technology',
    short_name: 'NSUT',
    location: 'Dwarka Sector 3, Delhi',
    latitude: 28.6074,
    longitude: 77.0404,
    email_domains: ['nsut.ac.in'],
    type: 'Technical University',
    city: 'Delhi'
  },
  {
    college_id: 'col_iitd',
    name: 'Indian Institute of Technology Delhi',
    short_name: 'IITD',
    location: 'Hauz Khas, Delhi',
    latitude: 28.5450,
    longitude: 77.1926,
    email_domains: ['iitd.ac.in'],
    type: 'Institute of National Importance',
    city: 'Delhi'
  }
];

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Checking if database seeding is required...');
    
    // Check if colleges already exist
    const collegeCount = await College.count();
    if (collegeCount === 0) {
      console.log('[Seeder] No colleges found. Seeding default colleges...');
      // bulkCreate is fully compatible with Sequelize v3
      await College.bulkCreate(defaultColleges);
      console.log(`[Seeder] Seeded ${defaultColleges.length} colleges successfully.`);
    } else {
      console.log(`[Seeder] ${collegeCount} colleges already exist in the database. Skipping seeder.`);
    }
  } catch (error) {
    console.error('[Seeder Error]: Failed to seed database:', error);
  }
};

module.exports = {
  seedDatabase
};
