
import React from 'react';
import { WithdrawalRequest, UserProfile, NotificationType } from '../types';
import PointsCard from './PointsCard';
import TheoremReachCard from './icons/TheoremReachCard'; // Corrected path
import WithdrawalCard from './WithdrawalCard';

interface DashboardProps {
  profile: UserProfile;
  onEarnPoints: () => void;
  isEarningPointsLoading: boolean;
  withdrawalRequests: WithdrawalRequest[];
  onWithdraw: (paypalEmail: string, pointsToWithdraw: number) => void;
  isWithdrawLoading: boolean;
  addNotification: (message: string, type: NotificationType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  profile,
  onEarnPoints,
  isEarningPointsLoading,
  withdrawalRequests,
  onWithdraw,
  isWithdrawLoading,
  addNotification
}) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8">
        <PointsCard points={profile.points} />
      </div>
       <TheoremReachCard 
          onEarnPoints={onEarnPoints} 
          isLoading={isEarningPointsLoading} 
          profile={profile} 
        />
      <WithdrawalCard
        currentPoints={profile.points}
        withdrawalRequests={withdrawalRequests}
        onWithdraw={onWithdraw}
        isWithdrawLoading={isWithdrawLoading}
      />
    </div>
  );
};

export default Dashboard;
