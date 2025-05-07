// src/app/api/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres'; // Import the sql tag
import bcrypt from 'bcryptjs'; // Use bcryptjs

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, password, fullName, gradeLevel } = await req.json();

    // --- Input Validation ---
    if (!phoneNumber || !password || !fullName || !gradeLevel) { return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 }); }
    const trimmedPhoneNumber = String(phoneNumber).trim();
    const trimmedFullName = String(fullName).trim();
    if (!/^(09|07)\d{8}$/.test(trimmedPhoneNumber)) { return NextResponse.json({ success: false, message: 'Invalid phone format (10 digits starting 09 or 07).' }, { status: 400 }); }
    if (password.length < 6) { return NextResponse.json({ success: false, message: 'Password min 6 characters.' }, { status: 400 }); }
    if (trimmedFullName.length < 3) { return NextResponse.json({ success: false, message: 'Full name min 3 characters.' }, { status: 400 }); }
    const allowedGrades = ["9", "10", "11", "12"];
    if (!allowedGrades.includes(String(gradeLevel))) { return NextResponse.json({ success: false, message: 'Invalid grade level.' }, { status: 400 }); }

    // --- Check for Existing User in DB ---
    // Use parameterized query to prevent SQL injection
    const { rows: existingUsers } = await sql`
      SELECT id FROM users WHERE phone_number = ${trimmedPhoneNumber} LIMIT 1;
    `;

    if (existingUsers.length > 0) {
      console.log(`Registration attempt failed: Phone ${trimmedPhoneNumber} already exists.`);
      return NextResponse.json({ success: false, message: 'Phone number already registered.' }, { status: 409 }); // Conflict
    }

    // --- Hash Password ---
    const saltRounds = 10; // Cost factor for hashing
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // --- Insert New User into DB ---
    // Use parameters for all values going into the query
    const { rows: insertedUsers } = await sql`
      INSERT INTO users (phone_number, password_hash, full_name, grade_level, is_confirmed)
      VALUES (${trimmedPhoneNumber}, ${passwordHash}, ${trimmedFullName}, ${String(gradeLevel)}, true) -- Auto-confirm true
      RETURNING id, phone_number, full_name, grade_level, registered_at; -- Return created user data (excluding hash)
    `;

    // Ensure insertion worked and data was returned
    if (!insertedUsers || insertedUsers.length === 0) {
        throw new Error("User registration failed after insertion attempt.");
    }
    const newUser = insertedUsers[0];

    console.log(`User registered: ${newUser.phone_number}, Name: ${newUser.full_name}, Grade: ${newUser.grade_level}`);

    return NextResponse.json({
        success: true,
        message: 'Registration successful! You are now logged in.',
        user: newUser // Send back the created user data
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error during user registration:', error);
    // Check for specific database errors (like unique constraint)
    if (error.message?.includes('duplicate key value violates unique constraint')) {
         return NextResponse.json({ success: false, message: 'Phone number already registered.' }, { status: 409 });
    }
    // Check if the error is from Vercel Postgres connection
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables. Ensure Vercel project is linked and env vars are pulled.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during registration.' }, { status: 500 });
  }
}
