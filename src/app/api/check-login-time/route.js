import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const connection = await connectToDatabase();

    const query = `
      SELECT LOGGEDIN
      FROM [SYSTEM.USERACCOUNT.1]
      WHERE EMAIL = @email
    `;

    const result = await connection.request()
      .input('email', email)
      .query(query);

    if (result.recordset.length === 0) {
      return NextResponse.json({ shouldLogout: true }); // User not found
    }

    const loggedIn = result.recordset[0].LOGGEDIN;
    if (!loggedIn) {
      return NextResponse.json({ shouldLogout: true }); // Never logged in
    }

    const loggedInDate = new Date(loggedIn);
    const now = new Date();

    // Allow fresh logins (within last 5 minutes) regardless of time
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (loggedInDate >= fiveMinutesAgo) {
      return NextResponse.json({ shouldLogout: false });
    }

    // Get today's 7 AM
    const today7AM = new Date();
    today7AM.setHours(7, 0, 0, 0);

    // If logged in before today's 7 AM, should logout
    const shouldLogout = loggedInDate < today7AM;

    return NextResponse.json({ shouldLogout });
  } catch (error) {
    console.error('Error checking login time:', error);
    return NextResponse.json({ shouldLogout: true }, { status: 500 }); // On error, assume should logout
  }
}
