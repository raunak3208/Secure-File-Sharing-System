# Secure File Sharing - Backend

Node.js/Express.js backend for the Secure File Sharing application.

## Structure

```
backend/
├── controllers/         # Request handlers (.js)
├── routes/              # API routes (.js)
├── models/              # Database models (.js)
├── middleware/          # Express middleware (.js)
├── utils/               # Utility functions (.js)
├── config/              # Configuration files (.js)
└── package.json
```

## Features
- User authentication (JWT)
- File access control & device binding
- Security violation logging
- Device fingerprinting
- View count tracking
- Download limit enforcement

## API Routes
- `/auth/*` - Authentication endpoints
- `/files/*` - File management
- `/access/*` - File access control
- `/security/*` - Security logging
