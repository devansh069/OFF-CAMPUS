const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const CollegeMaster = require('../models/CollegeMaster');
const { sequelize } = require('../config/db');

async function seedColleges() {
  try {
    const filePath = path.join(__dirname, '../data/delhi_ncr_colleges.xlsx');
    if (!fs.existsSync(filePath)) {
      console.log('[Seeder] Excel file not found at:', filePath);
      return;
    }

    console.log('[Seeder] Reading Excel file from:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`[Seeder] Found ${sheetData.length} colleges in Excel file. Processing...`);

    const recordsToInsert = [];
    const seenNames = new Set();

    for (const row of sheetData) {
      const collegeName = row['College Name'] ? String(row['College Name']).trim() : null;
      if (!collegeName || seenNames.has(collegeName.toLowerCase())) {
        continue;
      }

      seenNames.add(collegeName.toLowerCase());

      const sno = row['S.No'] || Math.random().toString(36).substring(2, 8);
      const collegeId = `col_ncr_${sno}`;
      
      // Derive a short name initials if possible (e.g., St. Stephen's College -> SSC)
      const cleanName = collegeName.replace(/[^a-zA-Z0-9 ]/g, '');
      const initials = cleanName.split(' ').map(w => w[0]).join('').toUpperCase();
      const shortName = initials.length >= 2 && initials.length <= 8 ? initials : null;

      recordsToInsert.push({
        college_id: collegeId,
        college_name: collegeName,
        short_name: shortName,
        affiliation_university: row['Affiliation/University'] ? String(row['Affiliation/University']).trim() : null,
        primary_stream: row['Primary Stream'] ? String(row['Primary Stream']).trim() : null,
        city: row['Location (City)'] ? String(row['Location (City)']).trim() : null,
        ncr_region: row['NCR Region'] ? String(row['NCR Region']).trim() : null,
        type: row['Type'] ? String(row['Type']).trim() : null
      });
    }

    console.log(`[Seeder] Bulk inserting/upserting ${recordsToInsert.length} unique colleges into database...`);

    // Batch insert 200 records at a time to prevent SQL payload limits
    const BATCH_SIZE = 200;
    let insertedCount = 0;

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      await CollegeMaster.bulkCreate(batch, {
        updateOnDuplicate: ['college_name', 'short_name', 'affiliation_university', 'primary_stream', 'city', 'ncr_region', 'type']
      });
      insertedCount += batch.length;
      console.log(`[Seeder] Processed ${insertedCount}/${recordsToInsert.length} colleges...`);
    }

    console.log('[Seeder] Successfully imported all Delhi NCR colleges into database!');
  } catch (error) {
    console.error('[Seeder Error]:', error);
  }
}

if (require.main === module) {
  sequelize.authenticate()
    .then(() => seedColleges())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedColleges;
