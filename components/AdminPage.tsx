import React from 'react';
import { AdminWithdrawalRequest, NotificationType } from '../types';


interface AdminPageProps {
  getAllRequests: () => Promise<AdminWithdrawalRequest[]>;
  addNotification: (message: string, type: NotificationType) => void;
}

const AdminPage: React.FC<AdminPageProps> = () => {




  // ... باقي الكود الخاص بواجهة الإدارة ...

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Withdrawal Requests</h1>
      {/* هنا يمكن إضافة جدول الطلبات وأزرار التحكم */}
    </div>
  );
};

export default AdminPage;
