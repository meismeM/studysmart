// src/app/api/get-performance-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // Expecting 'id' as query parameter
  console.log("API /api/get-performance-logs received id:", id); // Logging for debugging


  if (!id) {
    return NextResponse.json({ success: false, message: 'User ID (as "id") is required.' }, { status: 400 });
  }

  try {
    const { rows: performanceLogs } = await sql`
      SELECT log_id, score, subject, grade, quiz_type, questions_total, questions_correct, timestamp
      FROM user_performance_logs
      WHERE id = ${id} -- This 'id' column is the FK in user_performance_logs
      ORDER BY timestamp DESC
      LIMIT 10;
    `;
    const formattedLogs = performanceLogs.map(log => ({
        ...log,
        score: parseFloat(log.score)
    }));

    return NextResponse.json({ success: true, logs: formattedLogs }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching performance logs:', error);
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error while fetching logs.' }, { status: 500 });
  }
}
