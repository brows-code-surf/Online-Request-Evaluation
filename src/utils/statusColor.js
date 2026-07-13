export const getStatusColor = (status) => {
    switch (status) {
        case 'SUBMITTED':
            return 'bg-amber-100 text-amber-800 border-amber-300';

        case 'DRAFT':
            return 'bg-gray-100 text-gray-800 border-gray-300';

        case 'POSTED':
        case 'P.O. PROCESSING':
        case 1:
            return 'bg-purple-100 text-purple-800 border-purple-300';

        case 'FOR CONFIRMATION':
        case 'FOR P.O. CONFIRMATION':
            return 'bg-blue-100 text-blue-800 border-blue-300';

        case 'FOR REQUEST APPROVAL':
        case 'PENDING':
        case 0:
            return 'bg-yellow-100 text-yellow-800 border-yellow-300';

        case 'FOR PURCHASING LEAD TIME':
        case 'FOR P.O. APPROVAL':
        case 'PARTIALLY SERVED':
            return 'bg-orange-100 text-orange-800 border-orange-300';

        case 'FOR CANVASSING':
            return 'bg-sky-100 text-sky-800 border-sky-300';

        case 'FOR P.O.':
            return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300';

        case 'APPROVED':
        case 'P.O. APPROVED':
        case 'SERVED':
        case 'COMPLETED':
        case 'DELIVERED':
            return 'bg-green-100 text-green-800 border-green-300';

        case 'REJECTED':
        case 'CANCELLED':
        case 'P.O. REJECTED':
        case 'C.O.Q. REJECTED FROM P.O.':
        case 'P.R. REJECTED FROM P.O.':
            return 'bg-red-100 text-red-800 border-red-300';

        default:
            return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};

export default getStatusColor;