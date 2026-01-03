import React, { useState, useEffect } from 'react';
import api from '../api/client';

const AccountingView = () => {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [filters, setFilters] = useState({
    customer_id: '',
    status: '',
    date_from: '',
    date_to: '',
    locked: '',
    missing_references: false
  });

  const [savedViews] = useState([
    { name: 'Pending Review', filters: { status: 'logged' } },
    { name: 'Missing References', filters: { missing_references: true } },
    { name: 'Locked Not Invoiced', filters: { locked: 'true', status: 'logged,reviewed' } }
  ]);

  useEffect(() => {
    loadCustomers();
    loadEvents();
  }, [filters]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};

      if (filters.customer_id) params.customer_id = filters.customer_id;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.locked) params.locked = filters.locked;
      if (filters.missing_references) params.missing_references = 'true';

      const response = await api.get('/events', { params });
      setEvents(response.data);
      setSelectedEvents([]);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplySavedView = (view) => {
    setFilters((prev) => ({ ...prev, ...view.filters }));
  };

  const handleSelectEvent = (eventId) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map((e) => e.id));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedEvents.length === 0) {
      alert('Please select events to update');
      return;
    }

    if (!confirm(`Mark ${selectedEvents.length} events as ${newStatus}?`)) {
      return;
    }

    try {
      await api.post('/events/bulk/status', {
        event_ids: selectedEvents,
        status: newStatus
      });

      alert('Events updated successfully');
      loadEvents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update events');
    }
  };

  const handleExport = async (format) => {
    try {
      const payload = {
        format,
        customer_ids: filters.customer_id ? [parseInt(filters.customer_id)] : [],
        status: filters.status ? [filters.status] : [],
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined
      };

      const response = await api.post('/exports', payload, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `billable-events-${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export events');
    }
  };

  const handleUnlockEvent = async (eventId) => {
    const reason = prompt('Enter reason for unlocking this event:');

    if (!reason) return;

    try {
      await api.post(`/events/${eventId}/unlock`, { reason });
      alert('Event unlocked successfully');
      loadEvents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to unlock event');
    }
  };

  return (
    <div>
      <h2>Accounting - Event Review & Export</h2>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Saved Views</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {savedViews.map((view, index) => (
            <button
              key={index}
              className="btn btn-secondary"
              onClick={() => handleApplySavedView(view)}
            >
              {view.name}
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={() => setFilters({
              customer_id: '',
              status: '',
              date_from: '',
              date_to: '',
              locked: '',
              missing_references: false
            })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Filters</h3>
        <div className="filters">
          <div className="filter-group">
            <label>Customer</label>
            <select
              value={filters.customer_id}
              onChange={(e) => handleFilterChange('customer_id', e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="logged">Logged</option>
              <option value="reviewed">Reviewed</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Locked</label>
            <select
              value={filters.locked}
              onChange={(e) => handleFilterChange('locked', e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Locked Only</option>
              <option value="false">Unlocked Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div>
            <button
              className="btn btn-success"
              onClick={() => handleBulkStatusChange('reviewed')}
              disabled={selectedEvents.length === 0}
              style={{ marginRight: '10px' }}
            >
              Mark as Reviewed ({selectedEvents.length})
            </button>
            <button
              className="btn btn-success"
              onClick={() => handleBulkStatusChange('invoiced')}
              disabled={selectedEvents.length === 0}
            >
              Mark as Invoiced ({selectedEvents.length})
            </button>
          </div>
          <div>
            <button
              className="btn btn-primary"
              onClick={() => handleExport('csv')}
              style={{ marginRight: '10px' }}
            >
              Export CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleExport('xlsx')}
            >
              Export XLSX
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading events...</div>
        ) : events.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No events match the current filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedEvents.length === events.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subtype</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>SOP</th>
                  <th>SOW</th>
                  <th>Status</th>
                  <th>Locked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={() => handleSelectEvent(event.id)}
                      />
                    </td>
                    <td>{new Date(event.event_date).toLocaleDateString()}</td>
                    <td>{event.customer_name}</td>
                    <td>{event.category_name}</td>
                    <td>{event.subtype_name}</td>
                    <td>{event.quantity}</td>
                    <td>{event.unit_type}</td>
                    <td>
                      {event.sop_reference || (
                        <span style={{ color: '#dc3545' }}>Missing</span>
                      )}
                    </td>
                    <td>
                      {event.sow_reference || (
                        <span style={{ color: '#dc3545' }}>Missing</span>
                      )}
                    </td>
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
                    <td>
                      {event.ops_locked && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleUnlockEvent(event.id)}
                        >
                          Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
          Showing {events.length} event{events.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default AccountingView;
