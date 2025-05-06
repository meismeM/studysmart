// migrate-users.js
// This script reads users from users.json, hashes passwords,
// and inserts them into the Vercel Postgres database.
// Run ONLY ONCE locally after setting up the database table.

// Load environment variables from .env.development.local
require('dotenv').config({ path: '.env.development.local' });

const fs = require('fs').promises;
const path = require('path');
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

const usersFilePath = path.join(process.cwd(), 'users.json');
const saltRounds = 10; // bcrypt cost factor

async function migrateUsers() {
  console.log('Starting user migration...');

  // 1. Check for Database Connection String
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL environment variable not found.');
    console.error('Please ensure you have run `vercel env pull .env.development.local`');
    process.exit(1); // Exit script if DB URL is missing
  }

  // 2. Read users.json
  let sourceUsers = [];
  try {
    const fileContent = await fs.readFile(usersFilePath, 'utf-8');
    const usersData = JSON.parse(fileContent);
    if (usersData && Array.isArray(usersData.users)) {
      sourceUsers = usersData.users;
      console.log(`Found ${sourceUsers.length} users in users.json.`);
    } else {
      console.log('users.json is empty or has invalid format. No users to migrate.');
      return;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('users.json not found. No users to migrate.');
      return;
    }
    console.error('Error reading or parsing users.json:', error);
    process.exit(1);
  }

  if (sourceUsers.length === 0) {
    console.log('No users found in users.json to migrate.');
    return;
  }

  // 3. Process and Insert Users
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of sourceUsers) {
    // Basic validation of user object from JSON
    if (!user.phoneNumber || !user.password || !user.fullName || !user.gradeLevel) {
      console.warn(`Skipping user due to missing data: ${JSON.stringify(user)}`);
      skippedCount++;
      continue;
    }

    const trimmedPhoneNumber = String(user.phoneNumber).trim();
    const trimmedFullName = String(user.fullName).trim();
    const gradeLevelStr = String(user.gradeLevel);

    try {
      // Check if user already exists in DB
      const { rows: existing } = await sql`
        SELECT id FROM users WHERE phone_number = ${trimmedPhoneNumber} LIMIT 1;
      `;

      if (existing.length > 0) {
        console.log(`Skipping existing user: ${trimmedPhoneNumber}`);
        skippedCount++;
        continue;
      }

      // Hash the plain text password from JSON
      console.log(`Hashing password for ${trimmedPhoneNumber}...`);
      const passwordHash = await bcrypt.hash(user.password, saltRounds);

      // Insert into database
      console.log(`Inserting user: ${trimmedPhoneNumber}...`);
      await sql`
        INSERT INTO users (phone_number, password_hash, full_name, grade_level, is_confirmed)
        VALUES (${trimmedPhoneNumber}, ${passwordHash}, ${trimmedFullName}, ${gradeLevelStr}, true);
      `;

      migratedCount++;
      console.log(`Successfully migrated user: ${trimmedPhoneNumber}`);

    } catch (dbError) {
      console.error(`Error migrating user ${trimmedPhoneNumber}:`, dbError);
      errorCount++;
    }
  }

  // 4. Summary
  console.log('\n--- Migration Summary ---');
  console.log(`Total users in JSON: ${sourceUsers.length}`);
  console.log(`Successfully migrated: ${migratedCount}`);
  console.log(`Skipped (already exist or invalid data): ${skippedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
  console.log('-------------------------');

  if (errorCount > 0) {
    console.warn('Some users could not be migrated due to errors. Check logs above.');
  } else if (migratedCount > 0) {
    console.log('Migration completed successfully!');
  } else {
    console.log('No new users needed migration.');
  }
}

// Run the migration
migrateUsers().catch(err => {
  console.error("Unhandled error during migration:", err);
  process.exit(1);
});