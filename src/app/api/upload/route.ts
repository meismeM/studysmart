
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs/promises';
import pdf from 'pdf-parse';

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

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    console.log(`File saved successfully to ${filePath}`);

    // Extract text from PDF if the file is a PDF
    let textContent = '';
    if (file.type === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        textContent = data.text;
        console.log("Text content extracted from PDF.");
      } catch (pdfError) {
        console.error("Error extracting text from PDF:", pdfError);
        return NextResponse.json({ error: "Failed to extract text from PDF." }, { status: 500 });
      }
    } else {
      // For non-PDF files, attempt to read the file as text
      try {
        textContent = buffer.toString('utf-8');
        console.log("Text content read from file.");
      } catch (textError) {
        console.error("Error reading text from file:", textError);
        return NextResponse.json({ error: "Failed to read text from file." }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "File uploaded successfully.", textContent: textContent }, { status: 200 });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "File upload failed." }, { status: 500 });
  }
}
