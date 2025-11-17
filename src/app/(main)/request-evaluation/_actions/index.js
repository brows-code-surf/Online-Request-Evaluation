'use server';

import RequestEvaluation from '@/models/RequestEvaluation';

export async function fetchEvaluationLeftPanel(requesterName, requestStatus, filters = {}) {
    try {
        const requests = await RequestEvaluation.getEvaluationsLeftPanel(requesterName, requestStatus, filters);
        return requests;
    } catch (error) {
        console.error('Error fetching requests:', error);
        throw error;
    }
}

export async function fetchEvaluationDetails(referenceNo) {
    try {
        const details = await RequestEvaluation.getEvaluationDetails(referenceNo);
        return details;
    } catch (error) {
        console.error('Error fetching evaluation details:', error);
        throw error;
    }
}

// export async function fetchRequestStatus(referenceNo) {
//     try {
//         const requestStatus = await RequestEvaluation.getRequestStatus(referenceNo);
//         return requestStatus;
//     } catch (error) {
//         console.error('Error fetching request status:', error);
//         throw error;
//     }
// }

export async function approveEvaluation(referenceNo, approverName, currentStatus) {
    try {
        const result = await RequestEvaluation.updateApprovedEvaluation(referenceNo, approverName, currentStatus);
        return result;
    } catch (error) {
        console.error('Error approving evaluation:', error);
        throw error;
    }
}

export async function rejectEvaluation(referenceNo, approverName, rejectionReason) {
    try {
        const result = await RequestEvaluation.rejectApprovedEvaluation(referenceNo, approverName, rejectionReason);
        return result;
    } catch (error) {
        console.error('Error rejecting evaluation:', error);
        throw error;
    }
}

export async function fetchUserAvailableStatuses(userName) {
    try {
        const statuses = await RequestEvaluation.getUserAvailableStatuses(userName);
        return statuses;
    } catch (error) {
        console.error('Error fetching user available statuses:', error);
        throw error;
    }
}
