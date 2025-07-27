
import React from 'react';
import { WithdrawalRequest } from '../types';


interface WithdrawalHistoryTableProps {
  requests: WithdrawalRequest[];
}

const ListIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);


const WithdrawalHistoryTable: React.FC<WithdrawalHistoryTableProps> = ({ requests }) => {
  if (requests.length === 0) {
    return (
      <div className="mt-8 text-center text-slate-500 py-8 bg-slate-50 rounded-lg">
        <ListIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
        <p className="text-lg">No withdrawal requests yet.</p>
        <p className="text-sm">Your withdrawal history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-slate-300">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">PayPal Email</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Points</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Amount (USD)</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{request.paypal_email}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{request.points.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">${request.amount_usd.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' : 
                        request.status === 'Processed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-500">
                      {request.status === 'Rejected' && request.rejection_reason ? (
                        <span title={request.rejection_reason} className="italic cursor-help">
                           {request.rejection_reason.length > 40 ? `${request.rejection_reason.substring(0,37)}...` : request.rejection_reason}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
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
  );
};

export default WithdrawalHistoryTable;