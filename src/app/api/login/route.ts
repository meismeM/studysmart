// src/app/api/login/route.ts

import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
// import bcrypt from 'bcrypt'; // Uncomment for hashing

const usersFilePath = path.join(process.cwd(), 'users.json');

// **ADDED**: Helper function to read users data (consistent with register route)
async function readUsersFile(): Promise<{ users: any[] } | null> {
    try {
        const fileContent = await fs.readFile(usersFilePath, 'utf-8');
        const usersData = JSON.parse(fileContent);
        // Validate the basic structure
        if (usersData && Array.isArray(usersData.users)) {
            return usersData;
        } else {
            console.error("Invalid users.json structure during login read.");
            // Treat invalid structure same as file not found for security
            return null;
        }
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, means no users are registered yet.
            console.log("users.json not found during login attempt.");
            return null; // Return null, indicating no users / file doesn't exist
        } else if (error instanceof SyntaxError) {
             console.error("Error parsing users.json during login:", error);
             // Treat invalid JSON same as file not found
             return null;
        } else {
            // Other read errors (permissions, etc.)
            console.error("Failed to read users.json during login:", error);
            // Throw an error for unexpected issues
            throw new Error("Server error reading user data.");
        }
    }
}


export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    // --- Input Validation ---
    if (!phoneNumber || !password) {
        return NextResponse.json({ success: false, message: 'Phone number and password are required.' }, { status: 400 });
    }

    const trimmedPhoneNumber = String(phoneNumber).trim();

    // --- Read User Data ---
    // **FIXED**: Now calls the helper function
    const usersData = await readUsersFile();

    // --- Find User ---
    let user = null;
    // Check if usersData is not null before trying to find user
    if (usersData) {
      user = usersData.users.find((u: { phoneNumber: string }) => u.phoneNumber === trimmedPhoneNumber);
    }

    // If usersData was null (file issue) or user not found in array
    if (!user) {
      console.log(`Login attempt failed: User not found for phone number ${trimmedPhoneNumber}.`);
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 }); // Unauthorized
    }

    // --- Verify Password (!! INSECURE PLACEHOLDER !!) ---
    const passwordMatches = (password === user.password); // Replace with bcrypt compare!

    if (passwordMatches) {
      // NOTE: Check user.isConfirmed in real app
      console.log(`Login successful for ${trimmedPhoneNumber}`);

      // Return user details (excluding password)
      const { password: _excludedPassword, ...userData } = user; // Use a different name to avoid scope issues if needed

      return NextResponse.json({
          success: true,
          message: 'Login successful',
          user: userData // Send user data back
        });
    } else {
      console.log(`Login attempt failed: Incorrect password for ${trimmedPhoneNumber}.`);
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 }); // Unauthorized
    }

  } catch (error: any) {
      // Catch errors from readUsersFile or other unexpected issues
      console.error('Internal server error during login:', error);
      return NextResponse.json({ success: false, message: error.message || 'An internal error occurred.' }, { status: 500 });
  }
}

