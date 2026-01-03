# Quick Start Guide

Get the iRemedy Incubator Billable Event Tracking System running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running

## Quick Setup

### 1. Run the automated setup

```bash
./setup.sh
```

This will:
- Install all dependencies (backend + frontend)
- Create a template .env file

### 2. Configure database

Edit `backend/.env` and update the DATABASE_URL:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/incubator
```

### 3. Create and initialize database

```bash
# Create database
createdb incubator

# Run migrations
cd backend
npm run migrate

# Load seed data (includes test users and sample taxonomy)
npm run seed
```

### 4. Start the application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the application

Open your browser to: **http://localhost:5173**

## Test Login Credentials

| Role       | Email                      | Password    |
|------------|----------------------------|-------------|
| Operations | ops@iremedy.com           | password123 |
| Accounting | accounting@iremedy.com    | password123 |
| Admin      | admin@iremedy.com         | password123 |

## What's Included

The seed data includes:

**Customers:**
- Acme Corporation
- Global Industries Inc
- Tech Solutions LLC
- Retail Partners Group (inactive)

**Categories & Subtypes:**
- Order Processing (Manual Order, Order Modification)
- Inbound Operations (Non-Compliant Remediation, Re-palletization)
- Outbound Operations (Expedited Shipment)
- Returns Processing (Customer Return, Damaged Goods Inspection)
- Inventory Management (Cycle Count)
- Special Handling (Custom Kitting, Custom Labeling)
- Customer Service (Master Data Change)

## Try It Out

1. **Log in as Ops** (ops@iremedy.com)
   - Click "Log New Event"
   - Select a customer and event type
   - Create your first billable event

2. **Log in as Accounting** (accounting@iremedy.com)
   - Review events with filters
   - Try the saved views (Pending Review, Missing References)
   - Export events to XLSX

3. **Log in as Admin** (admin@iremedy.com)
   - Add a new customer
   - Create a new category or subtype
   - View all system capabilities

## Need Help?

See the full [README.md](README.md) for:
- Complete API documentation
- Business rules and workflows
- Deployment instructions
- Troubleshooting guide

## What's Next?

- Change default passwords
- Customize taxonomy for your operations
- Add your actual customers
- Start logging real billable events!
