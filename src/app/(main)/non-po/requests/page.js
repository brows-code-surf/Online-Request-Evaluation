"use client";

import React, { useMemo, useState, useEffect } from "react";
import HeaderNavBar from '@/app/_components/headerNavBar';
import { useAuth } from "@/utils/authContext";
import ProtectedRoute from "@/utils/protectedRoute";
import ContentLeftPanel from "../../_components/contentLeftPanel";
import SideNotchOpenLeftPanel from "../../_components/sideNotchOpenLeftPanel";
import { getRFPDetails } from './index';
import CreateRFPRequest from "./_components/CreateRFPRequest";
import DetailRFPRequest from "./_components/DetailRFPRequest";

function NonPoRequestsContent() {
    const { darkMode, user, isAdmin } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [rfpRequests, setRfpRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [refreshToken, setRefreshToken] = useState(0);

    useEffect(() => {
        const loadRequests = async () => {
            setRequestsLoading(true);
            try {
                const result = await getRFPDetails(isAdmin(), user, null);
                if (result.success && Array.isArray(result.rfpDetails)) {
                    setRfpRequests(result.rfpDetails);
                }
            } catch (error) {
                console.error('Error loading RFP requests:', error);
            } finally {
                setRequestsLoading(false);
            }
        };
        loadRequests();
    }, [user, isAdmin, refreshToken]);

    // Build the sidebar list by grouping RFP detail rows into one card per request
    const approvals = (() => {
        const grouped = new Map();
        rfpRequests.forEach(r => {
            if (!grouped.has(r.referenceNo)) {
                grouped.set(r.referenceNo, {
                    id: r.referenceNo,
                    title: r.payee || r.description || r.referenceNo,
                    status: r.rfpStatus || 'DRAFT',
                    requester: r.createdBy || r.costCenter,
                    department: r.location,
                    requestDate: r.dateCreated,
                    amount: 0,
                    budgetCode: r.budgetCode
                });
            }
            const group = grouped.get(r.referenceNo);
            group.amount += Number(r.amount) || 0;
        });
        return Array.from(grouped.values());
    })();

    const selectedRfp = selectedRequestId
        ? rfpRequests.filter(r => r.referenceNo === selectedRequestId)
        : [];

    const filteredApprovals = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return approvals
            .filter(a => {
                const matchesSearch = q === '' ||
                    [a.title, a.id, a.requester, a.department, a.budgetCode].some(field =>
                        field?.toString().toLowerCase().includes(q)
                    );
                const matchesStatus = filterStatus === '' || a.status === filterStatus;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === 'company') return a.title.localeCompare(b.title);
                if (sortBy === 'status') return a.status.localeCompare(b.status);
                return a.id - b.id;
            });
    }, [approvals, searchQuery, filterStatus, sortBy]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'FOR APPROVAL':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'DRAFT':
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const handleSelectRequest = (approval) => {
        setSelectedRequestId(approval.id);
    };

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <HeaderNavBar />
            <div className="flex flex-1 overflow-hidden pt-14">
                <ContentLeftPanel
                    sidebarOpen={sidebarOpen}
                    onSidebarClose={() => setSidebarOpen(false)}
                    headerTitle="Non-PO Requests"
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    approvals={filteredApprovals}
                    allApprovals={approvals}
                    selectedApprovalId={selectedRequestId}
                    onApprovalSelect={handleSelectRequest}
                    getStatusColor={getStatusColor}
                    filterType="purchase-request"
                    isLoading={requestsLoading}
                />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <SideNotchOpenLeftPanel
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />
                    <div className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                        {selectedRequestId ? (
                            <DetailRFPRequest
                                darkMode={darkMode}
                                rfp={selectedRfp}
                                onNewRequest={() => setSelectedRequestId(null)}
                                onRequestSaved={() => setRefreshToken(t => t + 1)}
                            />
                        ) : (
                            <CreateRFPRequest darkMode={darkMode} onRequestSaved={() => setRefreshToken(t => t + 1)} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <ProtectedRoute>
            <NonPoRequestsContent />
        </ProtectedRoute>
    );
}
