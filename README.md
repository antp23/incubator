# iRemedy Incubator - Billable Event Tracking System

A web-based internal tool for tracking billable events, designed to replace Notion as the system of record for incubator billable events.

## Features

### Operations (Ops)
- Log billable events as they occur
- View events by customer and time period
- Same-day edit window (events lock at midnight ET)
- Add operational notes to events

### Accounting
- Review all events with advanced filtering
- Saved views: Pending Review, Missing References, Locked Not Invoiced
- Bulk status updates (mark as reviewed/invoiced)
- Export to CSV and XLSX with summary sheets
- Unlock locked events with audit trail

### Admin
- Manage customers (add, edit, view)
- Manage taxonomy (categories and subtypes)
- Configure SOP/SOW references
- Set billing method hints and unit types

### System Features
- Role-based access control (Ops, Accounting, Admin)
- Automatic event locking after same-day edit window
- Complete audit trail for all changes
- SOP/SOW reference tracking
- External reference tracking (Order ID, Shipment ID, etc.)

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL database
- JWT authentication
- CSV/XLSX export capabilities
- Scheduled jobs for auto-locking

**Frontend:**
- React 18
- Vite build tool
- Axios for API calls
- React Router for navigation

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd incubator
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb incubator
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/incubator
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
TIMEZONE=America/New_York
```

Run migrations and seed data:

```bash
npm run migrate
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

## Running the Application

### Development Mode

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

Access the application at: `http://localhost:5173`

### Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Default Test Credentials

After running the seed script, use these credentials to log in:

- **Operations:** ops@iremedy.com / password123
- **Accounting:** accounting@iremedy.com / password123
- **Admin:** admin@iremedy.com / password123

**⚠️ IMPORTANT:** Change these passwords in production!

## Database Schema

### Users
- Authentication and role management
- Roles: ops, accounting, admin

### Customers
- Customer master data
- Status tracking (active/inactive)

### Categories & Subtypes (Taxonomy)
- Hierarchical event classification
- Default SOP/SOW references
- Billing method hints

### Billable Events
- Core event data
- Auto-locking mechanism
- Status workflow: logged → reviewed → invoiced

### Audit Log
- Complete change history
- User attribution
- Before/after values

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer (admin/accounting)
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (admin only)

### Taxonomy
- `GET /api/taxonomy/categories` - List categories with subtypes
- `POST /api/taxonomy/categories` - Create category (admin)
- `GET /api/taxonomy/subtypes` - List all subtypes
- `POST /api/taxonomy/subtypes` - Create subtype (admin)

### Events
- `GET /api/events` - List events with filters
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `POST /api/events/:id/notes` - Add note (append-only)
- `PATCH /api/events/:id/status` - Update status (accounting)
- `POST /api/events/bulk/status` - Bulk status update
- `POST /api/events/:id/unlock` - Unlock event (accounting/admin)

### Exports
- `POST /api/exports` - Export events to CSV/XLSX

### Audit
- `GET /api/audit` - Get audit log entries
- `GET /api/audit/event/:event_id` - Get event audit trail

## Scheduled Jobs

### Auto-Lock Job
Runs daily at 12:01 AM ET to lock events from previous days.

Run manually:
```bash
npm run lock-job
```

## Business Rules

### Event Locking
- Events are editable only until 11:59 PM ET on the Event Date
- At midnight ET, events automatically lock
- Locked events can only be unlocked by Accounting/Admin with a reason
- Unlock actions are logged in audit trail

### SOP/SOW References
- Auto-populated from taxonomy defaults
- Not strictly required but strongly encouraged
- UI shows warnings if missing
- Accounting can filter for missing references

### Status Workflow
1. **Logged** - Initial state when event is created
2. **Reviewed** - Accounting has reviewed
3. **Invoiced** - Event has been invoiced

### Role Permissions

**Ops:**
- Create events
- Edit same-day events only
- View events by customer
- Add notes to any event

**Accounting:**
- All Ops permissions
- Review all events
- Change event status
- Export events
- Unlock events

**Admin:**
- All Accounting permissions
- Manage customers
- Manage taxonomy
- Full system access

## Deployment

### Environment Variables

Production `.env` should include:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/incubator
JWT_SECRET=strong-random-secret-key
NODE_ENV=production
TIMEZONE=America/New_York
```

### Production Checklist

- [ ] Change default user passwords
- [ ] Update JWT_SECRET to strong random value
- [ ] Configure PostgreSQL with production credentials
- [ ] Set up SSL for database connection
- [ ] Configure CORS for production domain
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure reverse proxy (nginx)
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Schedule auto-lock job via cron

### Example PM2 Configuration

```bash
pm2 start backend/server.js --name incubator-api
pm2 save
pm2 startup
```

### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri /index.html;
    }
}
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists and user has permissions

### Auto-Lock Not Working
- Verify cron job is configured in server.js
- Check server timezone settings
- Run lock-job script manually to test

### Export Failures
- Check disk space for temporary files
- Verify ExcelJS dependency is installed
- Check file permissions

## Support

For issues and questions, contact the development team or create an issue in the repository.

## License

Internal use only - iRemedy Incubator
