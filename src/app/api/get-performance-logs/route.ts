// src/app/api/get-performance-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
  }

  try {
    // Fetch latest, e.g., 10 logs. Adjust LIMIT as needed.
    const { rows: performanceLogs } = await sql`
      SELECT log_id, score, subject, grade, quiz_type, questions_total, questions_correct, timestamp
      FROM user_performance_logs
      WHERE id = ${userId}
      ORDER BY timestamp DESC
      LIMIT 10; 
    `;
    // Convert score from string (DECIMAL from pg) to number
    const formattedLogs = performanceLogs.map(log => ({
        ...log,
        score: parseFloat(log.score) // score is likely string from db for DECIMAL type
    }));

    return NextResponse.json({ success: true, logs: formattedLogs }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching performance logs:', error);
     // Check if the error is from Vercel Postgres connection
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables. Ensure Vercel project is linked and env vars are pulled.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error while fetching logs.' }, { status: 500 });
  }
}