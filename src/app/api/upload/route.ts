import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const grade = formData.get('grade') as string;

    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    // Define the upload directory based on the grade
    const uploadDir = path.join(process.cwd(), 'public', 'textbooks', grade);

    // Ensure the directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (mkdirError: any) {
      if (mkdirError.code !== 'EEXIST') {
        console.error("Failed to create directory:", mkdirError);
        return NextResponse.json({ error: "Failed to create directory." }, { status: 500 });
      }
    }
    const fs = require('fs/promises');

    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    console.log(`File saved successfully to ${filePath}`);
    return NextResponse.json({ message: "File uploaded successfully." }, { status: 200 });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "File upload failed." }, { status: 500 });
  }
}
