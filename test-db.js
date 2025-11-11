import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { connectToDatabase } from './src/lib/db.js';

async function testConnection() {
    try {
        const connection = await connectToDatabase();
        console.log('Successfully connected to database');
        await connection.end();
    } catch (error) {
        console.error('Failed to connect:', error);
    }
}

testConnection();
