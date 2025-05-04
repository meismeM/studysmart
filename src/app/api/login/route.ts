// src/app/api/login/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres'; // Import the sql tag
import bcrypt from 'bcryptjs'; // Use bcryptjs

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    if (!phoneNumber || !password) { return NextResponse.json({ success: false, message: 'Phone number and password are required.' }, { status: 400 }); }

    const trimmedPhoneNumber = String(phoneNumber).trim();

    // --- Find User in DB ---
    // Select necessary fields, including the password hash
    const { rows: users } = await sql`
      SELECT id, phone_number, password_hash, full_name, grade_level, is_confirmed, registered_at
      FROM users
      WHERE phone_number = ${trimmedPhoneNumber}
      LIMIT 1;
    `;

    const user = users[0]; // Get the first (and should be only) result

    if (!user || !user.password_hash) { // Check if user exists and has a password hash
      console.log(`Login failed: User not found or incomplete for ${trimmedPhoneNumber}.`);
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 });
    }

    // --- Verify Password ---
    const passwordMatches = await bcrypt.compare(password, user.password_hash); // Compare input password with stored hash

    if (passwordMatches) {
      // NOTE: Check user.is_confirmed here in a real app if needed
      // if (!user.is_confirmed) { return NextResponse.json({ success: false, message: 'Phone number not verified.' }, { status: 403 }); }

      console.log(`Login successful for ${trimmedPhoneNumber}`);

      // Prepare user data to send back (excluding password hash)
      const { password_hash, ...userData } = user;

      return NextResponse.json({ success: true, message: 'Login successful', user: userData });
    } else {
      console.log(`Login failed: Incorrect password for ${trimmedPhoneNumber}.`);
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 }); // Unauthorized
    }

  } catch (error: any) {
      console.error('Internal server error during login:', error);
       // Check if the error is from Vercel Postgres connection
      if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables. Ensure Vercel project is linked and env vars are pulled.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
      }
      return NextResponse.json({ success: false, message: 'An internal error occurred.' }, { status: 500 });
  }
}
