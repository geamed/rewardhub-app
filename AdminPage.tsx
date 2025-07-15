
import React, { useState, useEffect, useCallback } from 'react';
import { AdminWithdrawalRequest, WithdrawalRequest, NotificationType } from './types';
// POINTS_PER_DOLLAR is not directly used here but good to keep if UI elements depend on it indirectly.
// import { POINTS_PER_DOLLAR } from '../constants'; 
import Modal from './Modal';

interface AdminPageProps {
  getAllRequests: () => Promise<AdminWithdrawalRequest[]>; // Now returns a Promise
  updateRequestStatus: (userId: string, requestId: string, newStatus: WithdrawalRequest['status'], reason?: string) => Promise<boolean>; // Now returns a Promise
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
      const allReqs = await getAllRequests(); // Await the promise
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
      // Optimistically update UI or re-fetch
       setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestToReject.id && req.userId === requestToReject.userId 
            ? { ...req, status: 'Rejected', rejection_reason: rejectionReasonInput } 
            : req
        )
      );
      // Optionally, call fetchRequests() if you want to ensure data consistency from the server,
      // especially if points refund logic could have side effects not captured by optimistic update.
      // await fetchRequests(); 
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