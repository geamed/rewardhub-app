import React, { useState, useEffect, useCallback } from 'react';
import { AdminWithdrawalRequest, WithdrawalRequest, NotificationType } from '../types';
import Modal from './Modal';

interface AdminPageProps {
  getAllRequests: () => Promise<AdminWithdrawalRequest[]>;
  updateRequestStatus: (userId: string, requestId: string, newStatus: WithdrawalRequest['status'], reason?: string) => Promise<boolean>;
  addNotification: (message: string, type: NotificationType) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ getAllRequests, updateRequestStatus, addNotification }) => {
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
      console.log('AdminPage: requests:', allReqs);
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
          req.id === requestId && req.userId === userId
            ? { ...req, status: 'Processed', rejection_reason: null } // Set status to Processed and clear rejection reason
            : req
        )
      );
    } else {
      addNotification(`Failed to approve request ${requestId.substring(0,8)}...`, NotificationType.ERROR);
    }
    setUpdatingRequestId(null);
  };


  const filteredRequests = requests.filter(request =>
    filter === 'all' ? true : request.status === filter
  );

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Withdrawal Requests</h1>
        <p className="text-gray-600">Manage and review user withdrawal requests</p>
      </div>

      {/* Filter controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
        <select
          id="statusFilter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Requests ({requests.length})</option>
          <option value="Pending Review">Pending Review ({requests.filter(r => r.status === 'Pending Review').length})</option>
          <option value="Processed">Processed ({requests.filter(r => r.status === 'Processed').length})</option>
          <option value="Rejected">Rejected ({requests.filter(r => r.status === 'Rejected').length})</option>
        </select>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading requests...</span>
        </div>
      )}

      {/* Request List */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No withdrawal requests found for the selected filter.</p>
        </div>
      )}

      {!isLoading && filteredRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b font-semibold text-left">Request ID</th>
              <th className="py-2 px-4 border-b font-semibold text-left">User ID</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Date & Time</th>
              <th className="py-2 px-4 border-b font-semibold text-left">User Email</th>
              <th className="py-2 px-4 border-b font-semibold text-left">PayPal Email</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Amount (USD)</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Points</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Status</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Rejection Reason</th>
              <th className="py-2 px-4 border-b font-semibold text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(request => (
              <tr key={request.id}>
                <td className="py-2 px-4 border-b text-xs font-mono">{request.id.substring(0, 8)}...</td>
                <td className="py-2 px-4 border-b text-xs font-mono">{request.userId.substring(0, 8)}...</td>
                <td className="py-2 px-4 border-b text-sm">
                  {request.created_at ? (
                    <div>
                      <div className="font-medium">{new Date(request.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(request.created_at).toLocaleTimeString()}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">No date</span>
                  )}
                </td>
                <td className="py-2 px-4 border-b text-sm">
                  {request.userEmail ? (
                    <span className="text-blue-600">{request.userEmail}</span>
                  ) : (
                    <span className="text-gray-400 italic">No email</span>
                  )}
                </td>
                <td className="py-2 px-4 border-b text-sm">
                  {request.paypal_email ? (
                    <span className="text-green-600 font-medium">{request.paypal_email}</span>
                  ) : (
                    <span className="text-red-400 italic">No PayPal email</span>
                  )}
                </td>
                <td className="py-2 px-4 border-b text-sm font-semibold">${request.amount_usd?.toFixed(2) || '0.00'}</td>
                <td className="py-2 px-4 border-b text-sm font-medium">{request.points?.toLocaleString() || '0'}</td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'Processed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </span>
                </td>
                <td className="py-2 px-4 border-b text-sm">
                  {request.rejection_reason ? (
                    <span className="text-red-600 italic" title={request.rejection_reason}>
                      {request.rejection_reason.length > 30 ? `${request.rejection_reason.substring(0, 27)}...` : request.rejection_reason}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  {request.status === 'Pending Review' && (
                    <>
                      <button
                        onClick={() => handleApproveRequest(request.userId, request.id)}
                        disabled={updatingRequestId === request.id}
                        className="bg-green-500 text-white px-2 py-1 rounded mr-2 disabled:opacity-50"
                      >
                        {updatingRequestId === request.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleOpenRejectionModal(request)}
                        disabled={updatingRequestId === request.id}
                        className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showRejectionModal}
        onClose={handleCloseRejectionModal}
        onConfirm={handleConfirmRejection}
        title="Reject Withdrawal Request"
        confirmText="Confirm Rejection"
        confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
      >
        {requestToReject && (
          <div>
            <p className="mb-4">Rejecting request ID: {requestToReject.id}</p>
            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block mb-2">Reason for Rejection:</label>
              <textarea
                id="rejectionReason"
                rows={4}
                className={`w-full border rounded p-2 ${rejectionReasonError ? 'border-red-500' : ''}`}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
              ></textarea>
              {rejectionReasonError && <p className="text-red-500 text-sm mt-1">{rejectionReasonError}</p>}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleCloseRejectionModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectionReasonInput.trim() || updatingRequestId === requestToReject.id}
                className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {updatingRequestId === requestToReject.id ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPage;
