// src/app/api/get-performance-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const DEFAULT_PAGE_SIZE = 10; // Number of logs per page

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

  console.log(`API /api/get-performance-logs: id=${id}, page=${pageParam}, pageSize=${pageSizeParam}`);

  if (!id) {
    return NextResponse.json({ success: false, message: 'User ID (as "id") is required.' }, { status: 400 });
  }

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : DEFAULT_PAGE_SIZE;

  if (isNaN(page) || page < 1) {
    return NextResponse.json({ success: false, message: 'Invalid page number.' }, { status: 400 });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) { // Max page size of 50 for sanity
    return NextResponse.json({ success: false, message: `Invalid page size (must be 1-50).` }, { status: 400 });
  }

  const offset = (page - 1) * pageSize;

  try {
    // Fetch logs for the current page
    const logsResult = await sql`
      SELECT log_id, score, subject, grade, quiz_type, questions_total, questions_correct, timestamp
      FROM user_performance_logs
      WHERE id = ${id}
      ORDER BY timestamp DESC
      LIMIT ${pageSize}
      OFFSET ${offset};
    `;
    
    const formattedLogs = logsResult.rows.map(log => ({
        ...log,
        score: parseFloat(log.score)
    }));

    // Optionally, get the total count of logs for this user to calculate total pages
    const totalCountResult = await sql`
        SELECT COUNT(*) as total_logs
        FROM user_performance_logs
        WHERE id = ${id};
    `;
    const totalLogs = parseInt(totalCountResult.rows[0].total_logs, 10);
    const totalPages = Math.ceil(totalLogs / pageSize);

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      currentPage: page,
      pageSize: pageSize,
      totalLogs: totalLogs,
      totalPages: totalPages,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching performance logs:', error);
    if (error.message?.includes('missing environment variable')) {
         console.error("Database connection error: Missing environment variables.");
         return NextResponse.json({ success: false, message: 'Database configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error while fetching logs.' }, { status: 500 });
  }
}
