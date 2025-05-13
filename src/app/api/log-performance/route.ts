// src/app/api/log-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("API /api/log-performance received body:", body); // Logging for debugging

    const {
      id, // Expecting 'id' from the request body (user's primary ID)
      score,
      subject,
      grade,
      quizType = 'mcq',
      questionsTotal,
      questionsCorrect,
    } = body;

    if (id === undefined || score === undefined) {
      return NextResponse.json({ success: false, message: 'User ID (as "id") and score are required.' }, { status: 400 });
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json({ success: false, message: 'Score must be a number between 0 and 100.' }, { status: 400 });
    }

    // The 'id' column in user_performance_logs is the foreign key to users.id
    await sql`
      INSERT INTO user_performance_logs (id, score, subject, grade, quiz_type, questions_total, questions_correct)
      VALUES (${id}, ${score}, ${subject || null}, ${grade || null}, ${quizType}, ${questionsTotal || null}, ${questionsCorrect || null});
    `;

    return NextResponse.json({ success: true, message: 'Performance logged successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error logging performance:', error);
    if (error.message?.includes('violates foreign key constraint')) {
        console.warn("A foreign key constraint was violated. Check user ID or other relations.", error.detail || error.message);
        return NextResponse.json({ success: false, message: 'Invalid user data. Cannot log performance.' }, { status: 400 });
    }
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error while logging performance.' }, { status: 500 });
  }
}
