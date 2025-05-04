// src/app/api/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
// !! IMPORTANT: In a real app, uncomment and use bcrypt !!
// import bcrypt from 'bcrypt';

const usersFilePath = path.join(process.cwd(), 'users.json');

// Helper function to ensure the users file exists and has the correct structure
// ** Correction: No argument needed here, it uses the global usersFilePath **
async function ensureUsersFile(): Promise<{ users: any[] }> {
    try {
        const fileContent = await fs.readFile(usersFilePath, 'utf-8');
        const usersData = JSON.parse(fileContent);
        // Validate the basic structure
        if (usersData && Array.isArray(usersData.users)) {
            return usersData;
        } else {
            console.warn("users.json has invalid structure. Re-initializing.");
            // If structure is invalid, overwrite with the correct empty structure
            const initialData = { users: [] };
            await fs.writeFile(usersFilePath, JSON.stringify(initialData, null, 2));
            return initialData;
        }
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, create it with the initial structure
            console.log("users.json not found. Creating a new one.");
            const initialData = { users: [] };
            await fs.writeFile(usersFilePath, JSON.stringify(initialData, null, 2));
            return initialData;
        } else if (error instanceof SyntaxError) {
             console.error("Error parsing users.json. Re-initializing.", error);
             // File exists but is not valid JSON, overwrite
             const initialData = { users: [] };
             await fs.writeFile(usersFilePath, JSON.stringify(initialData, null, 2));
             return initialData;
        }
         else {
            // Other read errors (permissions, etc.)
            console.error("Failed to read or initialize users.json:", error);
            throw new Error("Could not load or initialize user data file."); // Re-throw critical errors
        }
    }
}


export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, password, fullName, gradeLevel } = await req.json();

    // --- Input Validation ---
    if (!phoneNumber || !password || !fullName || !gradeLevel) {
      return NextResponse.json({ message: 'Phone number, password, full name, and grade level are required.' }, { status: 400 });
    }
    const trimmedPhoneNumber = String(phoneNumber).trim();
    const trimmedFullName = String(fullName).trim();

    if (!/^(09|07)\d{8}$/.test(trimmedPhoneNumber)) {
        return NextResponse.json({ message: 'Invalid phone number format (must be 10 digits starting with 09 or 07).' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (trimmedFullName.length < 3) {
        return NextResponse.json({ message: 'Full name must be at least 3 characters long.' }, { status: 400 });
    }
    const allowedGrades = ["9", "10", "11", "12"];
    if (!allowedGrades.includes(String(gradeLevel))) {
         return NextResponse.json({ message: `Invalid grade level. Please select one of: ${allowedGrades.join(', ')}.` }, { status: 400 });
    }

    // --- Load or Initialize User Data ---
    // ** Correction: Call helper without arguments **
    const usersData = await ensureUsersFile();

    // --- Check for Existing User ---
    const existingUser = usersData.users.find((u: { phoneNumber: string }) => u.phoneNumber === trimmedPhoneNumber);
    if (existingUser) {
      return NextResponse.json({ message: 'Phone number already registered.' }, { status: 409 });
    }

    // --- Hash Password (!! INSECURE PLACEHOLDER !!) ---
    const hashedPassword = password; // Replace with bcrypt!

    // --- Create New User Object ---
    const newUser = {
      phoneNumber: trimmedPhoneNumber,
      password: hashedPassword,
      fullName: trimmedFullName,
      gradeLevel: String(gradeLevel),
      isConfirmed: true, // Auto-confirm for now
      registeredAt: new Date().toISOString(),
    };

    // --- Add User and Save ---
    usersData.users.push(newUser);
    await fs.writeFile(usersFilePath, JSON.stringify(usersData, null, 2));

    console.log(`User registered: ${trimmedPhoneNumber}, Name: ${trimmedFullName}, Grade: ${gradeLevel}`);

    return NextResponse.json({ success: true, message: 'Registration successful! You are now logged in.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error during user registration:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during registration.' }, { status: 500 });
  }
}
