


import React, { useState, useEffect, useCallback } from 'react';
import { AdminWithdrawalRequest, WithdrawalRequest, NotificationType } from '../types';
import Modal from '../components/Modal';
import AdminPage from '../AdminPage';
export default AdminPage;

interface AdminPageProps {
  getAllRequests: () => Promise<AdminWithdrawalRequest[]>;
  updateRequestStatus: (userId: string, requestId: string, newStatus: WithdrawalRequest['status'], reason?: string) => Promise<boolean>;
  addNotification: (message: string, type: NotificationType) => void;
}

const AdminPage = ({ getAllRequests, updateRequestStatus, addNotification }: AdminPageProps) => {
  const [requests, setRequests] = useState<AdminWithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Pending Review' | 'Processed' | 'Rejected'>('Pending Review');
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState<AdminWithdrawalRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);


  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const allReqs = await getAllRequests();
      setRequests(allReqs);
    } catch (error) {
      console.error("AdminPage: Error fetching withdrawal requests:", error);
      addNotification("Failed to load withdrawal requests.", NotificationType.ERROR);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAllRequests, addNotification]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenRejectionModal = (request: AdminWithdrawalRequest) => {
    setRequestToReject(request);
    setRejectionReasonInput(request.rejection_reason || ''); 
    setRejectionReasonError(null); 
    setShowRejectionModal(true);
  };

  const handleCloseRejectionModal = () => {
    setShowRejectionModal(false);
    setRequestToReject(null);
    setRejectionReasonInput('');
    setRejectionReasonError(null);
  };

  const handleConfirmRejection = async () => {
    if (!requestToReject) return;
    if (!rejectionReasonInput.trim()) {
      setRejectionReasonError("Rejection reason cannot be empty.");
      return;
    }
    setRejectionReasonError(null);
    setUpdatingRequestId(requestToReject.id);

    const pointsToRefund = requestToReject.points; 
    const success = await updateRequestStatus(requestToReject.userId, requestToReject.id, 'Rejected', rejectionReasonInput);
    
    if (success) {
      addNotification(`Request ${requestToReject.id.substring(0,8)}... rejected. ${requestToReject.status !== 'Rejected' ? `${pointsToRefund} points refunded.` : 'Reason updated.'}`, NotificationType.SUCCESS);
       setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestToReject.id && req.userId === requestToReject.userId 
            ? { ...req, status: 'Rejected', rejection_reason: rejectionReasonInput } 
            : req
        )
      );
    } else {
      addNotification(`Failed to reject request ${requestToReject.id.substring(0,8)}...`, NotificationType.ERROR);
    }
    setUpdatingRequestId(null);
    handleCloseRejectionModal();
  };


  const handleApproveRequest = async (userId: string, requestId: string) => {
    setUpdatingRequestId(requestId);
    const success = await updateRequestStatus(userId, requestId, 'Processed');
    if (success) {
      addNotification(`Request ${requestId.substring(0,8)}... status updated to Processed.`, NotificationType.SUCCESS);
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId && req.userId === userId ? { ...req, status: 'Processed', rejection_reason: null } : req
        )
      );
    } else {
      addNotification(`Failed to update status for request ${requestId.substring(0,8)}...`, NotificationType.ERROR);
    }
    setUpdatingRequestId(null);
  };

  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

  if (isLoading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-3 text-slate-600">Loading withdrawal requests...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Admin Panel - Withdrawal Requests</h1>
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {(['Pending Review', 'Processed', 'Rejected', 'all'] as const).map(statusFilter => (
            <button
              key={statusFilter}
              onClick={() => setFilter(statusFilter)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === statusFilter 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {statusFilter === 'all' ? 'All' : statusFilter}
            </button>
          ))}
        </div>
        <button
            onClick={fetchRequests} 
            disabled={isLoading || !!updatingRequestId}
            className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-emerald-600 transition-colors shadow flex items-center disabled:opacity-50"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 mr-2 ${(isLoading && requests.length > 0) || updatingRequestId ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001a7.5 7.5 0 0 0-1.946-5.227 7.5 7.5 0 0 0-5.227-1.946A7.5 7.5 0 0 0 9 2.25v1.009S9 3.75 9 3.75m7.023 5.598a7.5 7.5 0 0 0-5.227-1.946H9v1.009S9 9 9 9m7.023 0a7.5 7.5 0 0 0-5.227 1.946H9s0 1.009 0 1.009m0-2.018a7.5 7.5 0 0 0-1.946-5.227A7.5 7.5 0 0 0 3 9m13.023 0H3m0 0a7.5 7.5 0 0 0 1.946 5.227A7.5 7.5 0 0 0 9 21.75v-1.009S9 20.25 9 20.25M9 3.75A7.5 7.5 0 0 1 13.75 3s1.009 0 1.009 0m-4.758 5.598H13.75M9 16.5A7.5 7.5 0 0 1 13.75 12s1.009 0 1.009 0m-4.758-2.25H13.75m0 0a7.5 7.5 0 0 0 5.227-1.946 7.5 7.5 0 0 0 1.946-5.227V3M3 9.009A7.5 7.5 0 0 1 7.75 3s1.009 0 1.009 0m-4.758 5.598H7.75m0 0A7.5 7.5 0 0 0 12 21.75v-1.009S12 20.25 12 20.25" />
            </svg>
            Refresh
        </button>
      </div>

      {filteredRequests.length === 0 && !isLoading ? (
        <p className="text-center text-slate-500 py-10">No withdrawal requests match the current filter.</p>
      ) : (
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">User Email</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 hidden md:table-cell">User ID</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">PayPal Email</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Points</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Amount</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Reason</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-left text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-700 sm:pl-6">{new Date(request.created_at).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{request.userEmail}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 hidden md:table-cell truncate max-w-xs" title={request.userId}>{request.userId.substring(0,15)}...</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{request.paypal_email}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-right">{request.points.toLocaleString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-right">${request.amount_usd.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 
                            request.status === 'Processed' ? 'bg-green-100 text-green-800 border border-green-300' :
                            'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-slate-500">
                          {request.rejection_reason ? (
                            <span title={request.rejection_reason} className="cursor-help">
                              {request.rejection_reason.length > 30 ? `${request.rejection_reason.substring(0, 27)}...` : request.rejection_reason}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6">
                          {request.status === 'Pending Review' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveRequest(request.userId, request.id)}
                                disabled={updatingRequestId === request.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-green-50 text-xs"
                              >
                                {updatingRequestId === request.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleOpenRejectionModal(request)}
                                disabled={updatingRequestId === request.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-red-50 text-xs"
                              >
                                {'Reject'}
                              </button>
                            </div>
                          )}
                           {request.status === 'Rejected' && (
                             <button
                                onClick={() => handleOpenRejectionModal(request)}
                                disabled={updatingRequestId === request.id}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-blue-50 text-xs"
                              >
                                Edit Reason
                             </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {requestToReject && (
        <Modal
            isOpen={showRejectionModal}
            onClose={handleCloseRejectionModal}
            onConfirm={handleConfirmRejection}
            title={requestToReject.status === 'Rejected' ? 'Edit Rejection Reason' : `Reject Request`}
            confirmText={requestToReject.status === 'Rejected' ? 'Update Reason' : 'Confirm Rejection'}
            confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        >
            <div className="space-y-4">
                <p>You are managing the withdrawal request from <span className="font-semibold">{requestToReject.userEmail}</span> for <span className="font-semibold">{requestToReject.points.toLocaleString()}</span> points.</p>
                <div>
                    <label htmlFor="rejectionReason" className="block text-sm font-medium text-slate-700">Rejection Reason</label>
                    <textarea
                        id="rejectionReason"
                        rows={3}
                        value={rejectionReasonInput}
                        onChange={(e) => {
                            setRejectionReasonInput(e.target.value);
                            if (rejectionReasonError) setRejectionReasonError(null);
                        }}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${rejectionReasonError ? 'border-red-500 ring-red-500 border-red-500' : 'border-slate-300'}`}
                        placeholder="e.g., Suspicious activity, terms of service violation..."
                    />
                    {rejectionReasonError && <p className="mt-1 text-xs text-red-500">{rejectionReasonError}</p>}
                </div>
                 {requestToReject.status !== 'Rejected' && (
                    <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
                        Note: The user's points (<span className="font-semibold">{requestToReject.points.toLocaleString()}</span>) will be refunded to their account.
                    </p>
                 )}
            </div>
        </Modal>
      )}

    </div>
  );
};

export default AdminPage;
