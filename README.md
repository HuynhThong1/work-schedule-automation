# Cinema Employee Scheduling System

A comprehensive web application for managing cinema employee schedules, built with Angular, NestJS, and MongoDB.

## Features

### For Employees
- **Login with Employee Code**: Simple authentication using unique employee codes
- **View Schedule**: See upcoming shifts and work assignments
- **Set Availability**: Define when you're available to work
- **Track Timesheet**: Monitor working hours and calculate monthly earnings

### For Managers
- **Employee Management**: Add, edit, and manage employee profiles
- **Shift Management**: Create and manage work shifts
- **Schedule Creation**: Generate and publish work schedules
- **Rule Configuration**: Set up dynamic scheduling rules and policies
- **Timesheet Review**: Review and approve employee timesheets

### For Senior Managers
- **Manager Management**: Manage other managers and their permissions
- **System Administration**: Full access to all system features

## Tech Stack

- **Frontend**: Angular 19 with PrimeNG UI components and TailwindCSS
- **Backend**: NestJS with MongoDB and Mongoose
- **Authentication**: JWT-based authentication with role-based access control
- **Scheduling**: Automated scheduling with configurable rules using lodash
- **Date/Time**: Moment.js for date manipulation (Asia/Ho_Chi_Minh timezone)
- **Deployment**: GitHub Actions + Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecinema-scheduling
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Start the development servers**
   ```bash
   # Start backend (NestJS)
   npm run start:backend

   # Start frontend (Angular) - in another terminal
   npm run start:frontend
   ```

6. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000/api

### Default Login Credentials

The system comes with sample data for testing:

**Employees:**
- Code: `EMP001` - Nguyen Van An (New Employee, Part-time)
- Code: `EMP002` - Tran Thi Binh (Junior Employee, Full-time)
- Code: `EMP003` - Le Van Cuong (New Employee, Part-time)
- Code: `EMP004` - Pham Thi Dung (Junior Employee, Full-time)

**Managers:**
- Code: `MGR001` - Hoang Van Manager (Middle Manager)
- Code: `ADMIN001` - Nguyen Thi Senior (Senior Manager/Cinema Manager)

## Project Structure

```
ecinema-scheduling/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── app/            # Main app module
│   │   ├── auth/           # Authentication module
│   │   ├── employees/      # Employee management
│   │   ├── managers/       # Manager management
│   │   ├── schemas/        # MongoDB schemas
│   │   ├── config/         # Configuration
│   │   └── seeds/          # Sample data
│   └── ...
├── frontend/               # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # UI components
│   │   │   ├── services/   # Angular services
│   │   │   ├── guards/     # Route guards
│   │   │   └── modules/    # Feature modules
│   │   └── ...
└── ...
```

## Development Commands

```bash
# Start backend development server
npm run start:backend

# Start frontend development server
npm run start:frontend

# Start both servers concurrently
npm run dev

# Build backend for production
npm run build:backend

# Build frontend for production
npm run build:frontend

# Build both applications
npm run build

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Lint code
npm run lint
```

## Backend API Endpoints

### Authentication
- `POST /api/auth/login` - Login with employee code
- `GET /api/auth/profile` - Get current user profile

### Employees
- `GET /api/employees` - List all employees (managers only)
- `GET /api/employees/me` - Get current employee profile
- `PATCH /api/employees/me/availability` - Update availability
- `POST /api/employees` - Create new employee (managers only)
- `GET /api/employees/available` - Get available employees for shift

### Managers
- `GET /api/managers` - List all managers
- `GET /api/managers/me` - Get current manager profile
- `POST /api/managers` - Create new manager (senior managers only)

### Shifts
- `GET /api/shifts` - List shifts
- `GET /api/shifts/date-range` - Get shifts by date range
- `POST /api/shifts` - Create new shift (managers only)
- `PATCH /api/shifts/:id` - Update shift (managers only)
- `DELETE /api/shifts/:id` - Delete shift (managers only)
- `POST /api/shifts/:id/assign` - Assign employee to shift
- `DELETE /api/shifts/:id/unassign/:employeeId` - Unassign employee
- `PATCH /api/shifts/:id/publish` - Publish shift

### Rules
- `GET /api/rules` - List all rules (managers only)
- `GET /api/rules/assignment` - Get assignment rules
- `GET /api/rules/constraint` - Get constraint rules
- `GET /api/rules/priority` - Get priority rules
- `POST /api/rules` - Create new rule (managers only)
- `PATCH /api/rules/:id` - Update rule (managers only)
- `DELETE /api/rules/:id` - Delete rule (managers only)
- `PATCH /api/rules/:id/activate` - Activate rule
- `PATCH /api/rules/:id/deactivate` - Deactivate rule

### Schedules
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create new schedule (managers only)
- `POST /api/schedules/generate` - Generate automated schedule
- `PATCH /api/schedules/:id/auto-assign` - Auto-assign employees
- `PATCH /api/schedules/:id/publish` - Publish schedule

### Timesheets
- `GET /api/timesheets` - List timesheets (filtered by role)
- `GET /api/timesheets/my-timesheet` - Get employee's own timesheet
- `GET /api/timesheets/employee/:id` - Get employee timesheets (managers only)
- `GET /api/timesheets/summary/:employeeId` - Get monthly summary
- `GET /api/timesheets/payroll-summary` - Get payroll summary (managers only)
- `POST /api/timesheets/calculate/:employeeId` - Calculate timesheet
- `POST /api/timesheets/calculate-all` - Calculate all timesheets
- `PATCH /api/timesheets/:id/finalize` - Finalize timesheet (managers only)

## API Documentation

The backend provides REST API endpoints:

### Authentication
- `POST /api/auth/login` - Login with employee code
- `GET /api/auth/profile` - Get current user profile

### Employees
- `GET /api/employees` - List all employees (managers only)
- `GET /api/employees/me` - Get current employee profile
- `PATCH /api/employees/me/availability` - Update availability
- `POST /api/employees` - Create new employee (managers only)

### Managers
- `GET /api/managers` - List all managers
- `GET /api/managers/me` - Get current manager profile
- `POST /api/managers` - Create new manager (senior managers only)

## Scheduling Rules

The system supports dynamic scheduling rules:

1. **Assignment Rules**: How employees are assigned to shifts
   - Random assignment (default)
   - Priority-based assignment

2. **Constraint Rules**: Limitations and requirements
   - Minimum staff per shift
   - Maximum hours per week
   - Availability respect

3. **Priority Rules**: Preference ordering
   - Junior employee priority
   - Full-time employee priority

## Deployment

The application is configured for deployment on Vercel:

1. **Frontend**: Deployed as a static site
2. **Backend**: Deployed as serverless functions
3. **Database**: MongoDB Atlas (recommended for production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
