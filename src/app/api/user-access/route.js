import USERACCESS from '../../../models/UserAccess';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeID = searchParams.get('employeeID');

    if (!employeeID) {
      return Response.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const modules = await USERACCESS.getAccessibleModulesWithChildren(employeeID);

    return Response.json({
      success: true,
      modules
    });
  } catch (error) {
    console.error('API Error fetching user access:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch user access modules'
    }, { status: 500 });
  }
}
