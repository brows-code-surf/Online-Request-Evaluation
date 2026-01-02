'use server';

import TicketModel from '@/models/Ticket.js';
import UserProfile from '@/models/UserProfile.js';
import Notification from '@/models/Notification.js';
import { sendEmailWithTemplate } from '@/utils/emailService.js';

export async function getAllTickets(filters = {}, user = null) {
  try {
    // Pass user to the model method for database-level filtering
    const tickets = await TicketModel.getAllTickets(filters, user);

    return { success: true, tickets };
  } catch (error) {
    console.error('Error getting tickets:', error);
    return { success: false, message: 'Failed to fetch tickets' };
  }
}

export async function getTicketById(ticketId, user = null) {
  try {
    const ticket = await TicketModel.getTicketById(ticketId, user);

    return { success: true, ticket };
  } catch (error) {
    console.error('Error getting ticket:', error);
    return { success: false, message: 'Failed to fetch ticket' };
  }
}

export async function createTicket(ticketData, creatorName = null) {
  try {
    // Validate required fields
    if (!ticketData.subject || !ticketData.subject.trim()) {
      return { success: false, message: 'Subject is required' };
    }
    if (!ticketData.category || !ticketData.category.trim()) {
      return { success: false, message: 'Category is required' };
    }
    if (!ticketData.status || !ticketData.status.trim()) {
      return { success: false, message: 'Status is required' };
    }

    const ticketId = await TicketModel.createTicket({
      subject: ticketData.subject.trim(),
      category: ticketData.category.trim(),
      status: ticketData.status.trim()
    }, creatorName);

    // Send notifications and emails to admins asynchronously
    notifyAdminsOfNewTicket(ticketId, ticketData, creatorName).catch(notificationError => {
      console.error('Error sending admin notifications:', notificationError);
    });

    return { success: true, ticketId, message: 'Ticket created successfully' };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { success: false, message: 'Failed to create ticket' };
  }
}

export async function updateTicket(ticketId, ticketData, user = null) {
  try {
    // Check permissions by attempting to fetch the ticket (filtering is done at DB level)
    await TicketModel.getTicketById(ticketId, user);

    // Validate required fields
    if (!ticketData.subject || !ticketData.subject.trim()) {
      return { success: false, message: 'Subject is required' };
    }
    if (!ticketData.category || !ticketData.category.trim()) {
      return { success: false, message: 'Category is required' };
    }
    if (!ticketData.status || !ticketData.status.trim()) {
      return { success: false, message: 'Status is required' };
    }

    const success = await TicketModel.updateTicket(ticketId, {
      subject: ticketData.subject.trim(),
      category: ticketData.category.trim(),
      status: ticketData.status.trim()
    });

    if (success) {
      return { success: true, message: 'Ticket updated successfully' };
    } else {
      return { success: false, message: 'Failed to update ticket' };
    }
  } catch (error) {
    console.error('Error updating ticket:', error);
    return { success: false, message: 'Failed to update ticket' };
  }
}

export async function deleteTicket(ticketId, user = null) {
  try {
    // Check permissions by attempting to fetch the ticket (filtering is done at DB level)
    await TicketModel.getTicketById(ticketId, user);

    const success = await TicketModel.deleteTicket(ticketId);
    if (success) {
      return { success: true, message: 'Ticket deleted successfully' };
    } else {
      return { success: false, message: 'Failed to delete ticket' };
    }
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return { success: false, message: 'Failed to delete ticket' };
  }
}

export async function getTicketStats(user = null) {
  try {
    const stats = await TicketModel.getTicketStats(user);
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    return { success: false, message: 'Failed to fetch ticket stats' };
  }
}

async function notifyAdminsOfNewTicket(ticketId, ticketData, creatorName) {
  try {
    // Get all admin users (department = 'MIS')
    const allUsers = await UserProfile.getAllUsers();
    const adminUsers = allUsers.filter(user => user.department && user.department.trim().toUpperCase() === 'MIS');

    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return;
    }

    // Use the creator name directly (it's already passed as a parameter)
    const finalCreatorName = creatorName || 'Unknown User';

    // Send email and notification to each admin
    for (const admin of adminUsers) {
      try {
        // Send email
        const emailData = {
          email: admin.email,
          subject: ticketData.subject, // Use user's subject as email subject
          title: ticketData.subject, // Use user's subject as email title
          companyName: 'SANTEH',
          greeting: `Hello ${admin.empName}`,
          name: admin.department, // Add name field to prevent undefined
          body: `A new support ticket has been created.<br><br>
                <strong>Ticket ID:</strong> ${ticketId}<br>
                <strong>Subject:</strong> ${ticketData.subject}<br>
                ${ticketData.description ? `<strong>Description:</strong> ${ticketData.description}<br>` : ''}
                <strong>Category:</strong> ${ticketData.category}<br>
                <strong>Status:</strong> ${ticketData.status}<br>
                <strong>Created by:</strong> ${finalCreatorName}<br><br>
                Please review and address this ticket as needed.`,
          buttonText: 'View Ticket',
          buttonUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/ticket`,
          companyEmail: 'support@santeh.com',
          companyPhone: '+1 (555) 123-4567',
          unsubscribeUrl: '#',
          preferencesUrl: '#'
        };

        await sendEmailWithTemplate(emailData);

        // Send notification
        const notification = new Notification(
          'New Support Ticket',
          `Ticket #${ticketId}: ${ticketData.subject} - Created by ${finalCreatorName}`,
          admin.empName,
          '/ticket'
        );

        await notification.save(creatorName);

        console.log(`Notification sent to admin: ${admin.empName} (${admin.employeeID})`);
      } catch (error) {
        console.error(`Error notifying admin ${admin.employeeID}:`, error);
        // Continue with other admins
      }
    }

    console.log(`Admin notifications sent for ticket ${ticketId}`);
  } catch (error) {
    console.error('Error in notifyAdminsOfNewTicket:', error);
    throw error;
  }
}
