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
      <h1 className="text-2xl font-bold mb-4">Admin Withdrawal Requests</h1>

      {/* Filter controls */}
      <div className="mb-4">
        <label htmlFor="statusFilter" className="mr-2">Filter by Status:</label>
        <select
          id="statusFilter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded p-1"
        >
          <option value="all">All</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Processed">Processed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Loading indicator */}
      {isLoading && <p>Loading requests...</p>}

      {/* Request List (Complete this part based on your UI) */}
      {!isLoading && filteredRequests.length === 0 && (
        <p>No withdrawal requests found for the selected filter.</p>
      )}

      {!isLoading && filteredRequests.length > 0 && (
        // Example: Table structure
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Request ID</th>
              <th className="py-2 px-4 border-b">User ID</th>
               <th className="py-2 px-4 border-b">User Email</th> {/* Added User Email */}
              <th className="py-2 px-4 border-b">Amount (USD)</th> {/* Corrected header */}
              <th className="py-2 px-4 border-b">Points</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Reason (if rejected)</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(request => (
              <tr key={request.id}> {/* Use request.id as the key */}
                {/* Render request data here */}
                <td className="py-2 px-4 border-b">{request.id}</td>
                <td className="py-2 px-4 border-b">{request.userId}</td>
                 <td className="py-2 px-4 border-b">{request.userEmail}</td> {/* Display User Email */}
                 <td className="py-2 px-4 border-b">${request.amount_usd?.toFixed(2)}</td> {/* Corrected to amount_usd and formatted */}
                <td className="py-2 px-4 border-b">{request.points}</td>
                <td className="py-2 px-4 border-b">{request.status}</td>
                <td className="py-2 px-4 border-b">{request.rejection_reason}</td>

                <td className="py-2 px-4 border-b">
                  {/* Add Approve/Reject buttons here */}
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
      )}

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectionModal} // Corrected prop name from 'show' to 'isOpen'
        onClose={handleCloseRejectionModal}
        onConfirm={handleConfirmRejection} // Added onConfirm prop
        title="Reject Withdrawal Request"
        confirmText="Confirm Rejection" // Added confirmText prop
        confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500" // Added confirmButtonClass prop
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
