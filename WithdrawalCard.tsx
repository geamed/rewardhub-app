
import React from 'react';
import { WithdrawalRequest } from './types';
import WithdrawalForm from './WithdrawalForm';
import WithdrawalHistoryTable from './WithdrawalHistoryTable';
import ArrowRightOnRectangleIcon from './ArrowRightOnRectangleIcon';

interface WithdrawalCardProps {
  currentPoints: number;
  withdrawalRequests: WithdrawalRequest[];
  onWithdraw: (paypalEmail: string, pointsToWithdraw: number) => void;
  isWithdrawLoading: boolean;
}

const WithdrawalCard: React.FC<WithdrawalCardProps> = ({ currentPoints, withdrawalRequests, onWithdraw, isWithdrawLoading }) => {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-700">Withdraw Points</h2>
        <ArrowRightOnRectangleIcon className="h-8 w-8 text-primary" />
      </div>
      
      <WithdrawalForm 
        currentPoints={currentPoints} 
        onWithdraw={onWithdraw}
        isLoading={isWithdrawLoading} 
      />
      
      <div className="mt-10">
        <h3 className="text-lg font-medium text-slate-700 mb-2">Withdrawal History</h3>
        <WithdrawalHistoryTable requests={withdrawalRequests} />
      </div>
    </div>
  );
};

export default WithdrawalCard;
