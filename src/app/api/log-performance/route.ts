// src/app/api/log-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const {
      userId, // This is the foreign key `id` from your `users` table
      score,  // Percentage score, e.g., 85.00 for 85%
      subject,
      grade,
      quizType = 'mcq', // Default to 'mcq'
      questionsTotal,
      questionsCorrect,
    } = await request.json();

    if (userId === undefined || score === undefined) {
      return NextResponse.json({ success: false, message: 'User ID and score are required.' }, { status: 400 });
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json({ success: false, message: 'Score must be a number between 0 and 100.' }, { status: 400 });
    }
    // Ensure subject, grade, questionsTotal, questionsCorrect are either provided or explicitly null
    // if your DB schema allows NULLs and you want to represent missing data that way.
    // The provided schema allows NULL for subject, grade, questions_total, questions_correct.

    await sql`
      INSERT INTO user_performance_logs (id, score, subject, grade, quiz_type, questions_total, questions_correct)
      VALUES (${userId}, ${score}, ${subject || null}, ${grade || null}, ${quizType}, ${questionsTotal || null}, ${questionsCorrect || null});
    `;

    return NextResponse.json({ success: true, message: 'Performance logged successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error logging performance:', error);
    // Check for specific errors, e.g., foreign key violation if userId is invalid
    if (error.message?.includes('violates foreign key constraint "fk_performance_log_user"')) { // Adjust constraint name if different
        return NextResponse.json({ success: false, message: 'Invalid user ID. Cannot log performance.' }, { status: 400 });
    }
    if (error.message?.includes('violates foreign key constraint')) { // Generic FK violation
        console.warn("A foreign key constraint was violated. Check user_id or other relations.");
        return NextResponse.json({ success: false, message: 'Invalid related data. Cannot log performance.' }, { status: 400 });
    }
    // Check if the error is from Vercel Postgres connection
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables. Ensure Vercel project is linked and env vars are pulled.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error while logging performance.' }, { status: 500 });
  }
}