import React, { useState, useEffect, useCallback } from 'react';
import { AdminWithdrawalRequest, WithdrawalRequest, NotificationType } from '../types';
import Modal from '../components/Modal';

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

  // ... باقي الكود الخاص بواجهة الإدارة ...

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Withdrawal Requests</h1>
      {/* هنا يمكن إضافة جدول الطلبات وأزرار التحكم */}
    </div>
  );
};

export default AdminPage;
