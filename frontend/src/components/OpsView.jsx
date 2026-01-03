import React, { useState, useEffect } from 'react';
import api from '../api/client';
import EventForm from './EventForm';

const OpsView = () => {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('today');

  useEffect(() => {
    loadCustomers();
    loadEvents();
  }, [selectedCustomer, filter]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers?status=active');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};

      if (selectedCustomer) {
        params.customer_id = selectedCustomer;
      }

      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.date_from = today;
        params.date_to = today;
      } else if (filter === 'week') {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        params.date_from = weekAgo.toISOString().split('T')[0];
        params.date_to = today.toISOString().split('T')[0];
      }

      const response = await api.get('/events', { params });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreated = () => {
    setShowForm(false);
    loadEvents();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Billable Events</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Log New Event
        </button>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label>Time Period</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="today">Today's Events</option>
              <option value="week">This Week</option>
              <option value="all">All Events</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.legal_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading events...</div>
      ) : (
        <div className="card">
          {events.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No events found. Click "Log New Event" to create one.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subtype</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Locked</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.event_date).toLocaleDateString()}</td>
                    <td>{event.customer_name}</td>
                    <td>{event.category_name}</td>
                    <td>{event.subtype_name}</td>
                    <td>{event.quantity}</td>
                    <td>{event.unit_type}</td>
                    <td>
                      <span className={`badge badge-${event.status}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>
                      {event.ops_locked && (
                        <span className="badge badge-locked">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <EventForm
          onClose={() => setShowForm(false)}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
};

export default OpsView;
