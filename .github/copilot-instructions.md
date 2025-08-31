# GitHub Copilot Instructions for ECinema Scheduling

## Project Overview
This is a full-stack web application for cinema employee scheduling management, built with:
- **Backend**: NestJS with TypeScript, MongoDB (Mongoose), JWT authentication
- **Frontend**: Angular 20+ with PrimeNG UI components
- **Build System**: Nx monorepo structure
- **Database**: MongoDB with Mongoose schemas
- **Authentication**: JWT-based with passport strategies

## Architecture Guidelines

### Backend (NestJS)
- Use modular architecture with separate modules for each feature
- Follow the existing pattern: controller → service → schema
- All modules should be in `backend/src/` with their own folder
- Use Mongoose schemas in `backend/src/schemas/` directory
- Implement proper DTOs for validation with class-validator decorators

### Frontend (Angular)
- Use standalone components approach (Angular 20+)
- Leverage PrimeNG components for UI consistency
- Organize components in `frontend/src/app/components/`
- Use services in `frontend/src/app/services/` for API communication
- Follow reactive programming patterns with RxJS

### File Structure Patterns
```
backend/src/
├── {feature}/
│   ├── {feature}.controller.ts
│   ├── {feature}.service.ts
│   └── {feature}.module.ts
├── schemas/
│   └── {entity}.schema.ts
└── auth/ (guards, strategies, decorators)

frontend/src/app/
├── components/
│   └── {feature}/
├── services/
├── guards/
└── shared/
```

## Coding Standards

### Backend Code Style
- Use TypeScript with strict type checking
- Implement proper error handling with NestJS exception filters
- Use environment variables for configuration via ConfigModule
- Follow NestJS decorators pattern (@Controller, @Injectable, @Module)
- Use Mongoose decorators (@Prop, @Schema) for database schemas
- Implement proper validation with class-validator
- Use proper HTTP status codes and responses

### Frontend Code Style
- Use TypeScript with Angular's reactive forms
- Implement proper component lifecycle hooks
- Use Angular services for state management and API calls
- Follow Angular style guide for naming conventions
- Use PrimeNG components consistently
- Implement proper error handling and loading states

### Schema Definitions
- Use Mongoose schemas with proper TypeScript types
- Include timestamps: true for audit trails
- Define proper indexes for performance
- Use enums for constrained values
- Include proper validation rules

### API Design
- Follow RESTful conventions
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Implement consistent response formats
- Use proper status codes
- Include proper error responses
- Implement authentication guards where needed

## Domain-Specific Rules

### Employee Management
- Employee codes must be unique
- Support employee types: 'new', 'junior'
- Track full-time vs part-time status
- Manage availability slots with day/time ranges
- Include contact information and emergency contacts

### Shift Management
- Include theater, movie, date, start/end times
- Track employee assignments
- Support shift status tracking
- Implement proper validation for shift overlaps

### Scheduling Rules
- Implement business logic for scheduling constraints
- Support priority-based shift assignment
- Handle availability conflicts
- Include overtime calculations

### Authentication & Authorization
- Use JWT tokens for authentication
- Implement role-based access (employee vs manager)
- Protect sensitive endpoints with guards
- Include proper session management

## Testing Guidelines
- Write unit tests for services and controllers
- Use Jest for testing framework
- Mock external dependencies
- Test authentication and authorization flows
- Include integration tests for critical paths

## Security Best Practices
- Hash passwords with bcryptjs
- Validate all input data
- Implement proper CORS configuration
- Use environment variables for secrets
- Sanitize database queries
- Implement rate limiting where appropriate

## UI/UX Guidelines
- Use PrimeNG components for consistent styling
- Implement responsive design principles
- Include proper loading states and error messages
- Use Angular's reactive forms for form validation
- Implement proper accessibility features
- Follow Material Design or similar design system

## API Response Patterns
```typescript
// Success response
{
  data: T,
  message?: string,
  status: number
}

// Error response
{
  error: string,
  message: string,
  statusCode: number
}
```

## Database Patterns
- Use proper Mongoose schema validation
- Implement soft deletes where appropriate
- Include audit fields (createdAt, updatedAt)
- Use proper indexing for performance
- Implement data relationships correctly

## Code Generation Preferences
- Generate complete, working code with proper imports
- Include proper error handling
- Add TypeScript types and interfaces
- Follow the existing project structure
- Include proper validation and sanitization
- Generate tests when appropriate
- Use the established patterns and conventions

## Dependencies to Prefer
- **Backend**: @nestjs/*, mongoose, class-validator, class-transformer, bcryptjs, passport-jwt
- **Frontend**: @angular/*, primeng, rxjs, @fullcalendar/* for calendar features
- **Testing**: jest, @nestjs/testing, @angular/core/testing
- **Build**: @nx/* for monorepo management

## Common Operations
- CRUD operations should follow the established controller/service pattern
- Form validation should use Angular reactive forms with proper validators
- Date/time handling should use moment.js or native Date APIs
- File uploads should be handled with proper validation
- Search and filtering should be implemented server-side when possible

## Git Commit Guidelines
When suggesting commit messages, always follow the Commitizen conventional commit format:

### Commit Message Structure
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Scopes (Cinema Scheduling Context)
- **auth**: Authentication and authorization
- **employees**: Employee management
- **shifts**: Shift scheduling and management
- **managers**: Manager functionality
- **scheduling**: Scheduling algorithms and logic
- **timesheets**: Timesheet management
- **ui**: User interface components
- **api**: API endpoints and services
- **database**: Database schemas and migrations
- **config**: Configuration changes

### Examples
```
feat(employees): add employee availability management
fix(shifts): resolve shift overlap validation bug
docs(api): update scheduling endpoint documentation
refactor(auth): improve JWT token validation
test(scheduling): add unit tests for shift assignment
chore(deps): update Angular to version 20.2
```

When generating code, always consider the cinema scheduling domain context and ensure the code fits within the existing monorepo structure and follows the established patterns.
