# Online Request Evaluation System

This is a comprehensive online system built with [Next.js](https://nextjs.org) for managing purchase requests, request evaluations, tickets, user accounts, and more. It features real-time notifications, user authentication, role-based access control, and integrations with multiple databases and email services.

## Features

- **Purchase Requests**: Create, manage, and track purchase requests with detailed forms and approval workflows.
- **Request Evaluation**: Evaluate and process submitted requests with comprehensive tracking.
- **Ticket System**: Handle support tickets with detailed tracking and resolution workflows.
- **User Management**: Complete user account management with profiles, access controls, and approval processes.
- **Dashboard**: Analytics and reporting with charts, recent activities, and system statistics.
- **Real-time Notifications**: Live updates using Socket.io and Pusher for instant notifications.
- **Authentication**: Secure login/logout with session management and OTP verification.
- **Email Integration**: Automated email notifications via SendGrid and Nodemailer.
- **Multi-Database Support**: Integration with MongoDB, MSSQL, and MySQL.
- **Responsive UI**: Built with Tailwind CSS and Framer Motion for smooth animations.

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- MongoDB, MSSQL, or MySQL database
- SendGrid account for email services (optional)
- Pusher account for real-time features (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/brows-code-surf/Online-Request-Evaluation.git
   cd Online-Request-Evaluation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your configuration:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   MSSQL_CONNECTION_STRING=your_mssql_connection_string
   MYSQL_HOST=your_mysql_host
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=your_mysql_database
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   SENDGRID_API_KEY=your_sendgrid_api_key
   PUSHER_APP_ID=your_pusher_app_id
   PUSHER_KEY=your_pusher_key
   PUSHER_SECRET=your_pusher_secret
   PUSHER_CLUSTER=your_pusher_cluster
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

- `src/app/` - Next.js app router pages and API routes
- `src/models/` - Database models and schemas
- `src/lib/` - Database connections and utility libraries
- `src/utils/` - Helper functions and constants
- `src/hooks/` - Custom React hooks
- `public/` - Static assets and images

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express
- **Database**: MongoDB, MSSQL, MySQL
- **Real-time**: Socket.io, Pusher
- **Authentication**: NextAuth.js
- **Email**: SendGrid, Nodemailer
- **Charts**: Recharts
- **Icons**: Heroicons, Lucide React

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API.
- [MongoDB Documentation](https://docs.mongodb.com/) - Database operations and queries.
- [Socket.io Documentation](https://socket.io/docs/) - Real-time communication.
- [Pusher Documentation](https://pusher.com/docs/) - Real-time messaging service.

You can check out [the project repository](https://github.com/brows-code-surf/Online-Request-Evaluation) for more details and contributions.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

**Note**: Ensure your environment variables are configured in your deployment platform for full functionality.
