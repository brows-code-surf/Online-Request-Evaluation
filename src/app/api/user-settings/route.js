import { NextResponse } from 'next/server';
import UserProfile from '@/models/UserProfile.js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeID = searchParams.get('employeeID');

        if (!employeeID) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const settings = await UserProfile.getUserSettings(employeeID);

        if (!settings) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
