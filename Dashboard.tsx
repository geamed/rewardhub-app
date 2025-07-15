
import React from 'react';
import { WithdrawalRequest } from './types';
import PointsCard from './PointsCard';
import TheoremReachCard from './TheoremReachCard';
import WithdrawalCard from './WithdrawalCard';

interface DashboardProps {
  points: number;
  onEarnPoints: () => void;
  isEarningPointsLoading: boolean;
  withdrawalRequests: WithdrawalRequest[];
  onWithdraw: (paypalEmail: string, pointsToWithdraw: number) => void;
  isWithdrawLoading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  points,
  onEarnPoints,
  isEarningPointsLoading,
  withdrawalRequests,
  onWithdraw,
  isWithdrawLoading
}) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PointsCard points={points} />
        <TheoremReachCard onEarnPoints={onEarnPoints} isLoading={isEarningPointsLoading} />
      </div>
      <WithdrawalCard
        currentPoints={points}
        withdrawalRequests={withdrawalRequests}
        onWithdraw={onWithdraw}
        isWithdrawLoading={isWithdrawLoading}
      />
    </div>
  );
};

export default Dashboard;
