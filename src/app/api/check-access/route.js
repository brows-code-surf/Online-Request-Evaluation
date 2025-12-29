import USERACCESS from '../../../models/UserAccess';

export async function POST(request) {
  try {
    const { pathname, employeeID } = await request.json();

    if (!pathname || !employeeID) {
      return Response.json({
        success: false,
        error: 'Pathname and employeeID are required'
      }, { status: 400 });
    }

    // Remove leading slash for database lookup
    const modulePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;

    // Check if user has access to this module
    const hasAccess = await USERACCESS.checkAccess(employeeID, modulePath);

    return Response.json({
      success: true,
      hasAccess
    });
  } catch (error) {
    console.error('API Error checking access:', error);
    return Response.json({
      success: false,
      error: 'Failed to check access'
    }, { status: 500 });
  }
}
