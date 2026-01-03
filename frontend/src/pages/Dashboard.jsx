import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OpsView from '../components/OpsView';
import AccountingView from '../components/AccountingView';
import AdminView from '../components/AdminView';

const Dashboard = () => {
  const { user, logout, isOps, isAccounting, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(
    isOps ? 'events' : isAccounting ? 'accounting' : 'admin'
  );

  return (
    <div>
      <div className="navbar">
        <div className="navbar-brand">iRemedy Incubator</div>
        <div className="navbar-user">
          <span>{user?.fullName}</span>
          <span style={{ opacity: 0.7 }}>({user?.role})</span>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div className="tabs">
          {(isOps || isAdmin) && (
            <button
              className={`tab ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
          )}
          {(isAccounting || isAdmin) && (
            <button
              className={`tab ${activeTab === 'accounting' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounting')}
            >
              Accounting
            </button>
          )}
          {isAdmin && (
            <button
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          )}
        </div>

        {activeTab === 'events' && <OpsView />}
        {activeTab === 'accounting' && <AccountingView />}
        {activeTab === 'admin' && <AdminView />}
      </div>
    </div>
  );
};

export default Dashboard;
