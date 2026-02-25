# SecureShare - Secure File Sharing Application

## Project Structure

```
project-root/
├── frontend/
│   ├── src/
│   │   ├── components/        # React components (.jsx files)
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── shared/
│   │   │   └── ui/
│   │   ├── pages/             # Page components (.jsx files)
│   │   ├── services/          # API services (.js files)
│   │   └── styles/            # CSS files
│   ├── public/                # Static files
│   └── package.json
├── backend/
│   ├── controllers/           # Route controllers (.js files)
│   ├── routes/                # API routes (.js files)
│   ├── models/                # Database models (.js files)
│   ├── middleware/            # Custom middleware (.js files)
│   ├── utils/                 # Utility functions (.js files)
│   ├── config/                # Configuration files (.js files)
│   └── server.js              # Entry point
├── app/                       # Next.js App Router (current production setup)
├── components/                # Shared UI components
├── lib/                       # Utilities and libraries
├── scripts/                   # Database migrations
└── package.json
```

## Frontend Setup (React.jsx)

The `frontend/` folder contains a clean, organized React application structure with all components and logic in `.jsx` files:

- **components/**: Reusable React components organized by feature
- **pages/**: Page-level components 
- **services/**: API call services for backend communication
- **styles/**: CSS and styling files

## Backend Setup (Node.js/Express.js)

The `backend/` folder contains the Node.js/Express API with all files in `.js` format:

- **controllers/**: Request handlers for API routes
- **routes/**: API endpoint definitions
- **models/**: Database query models
- **middleware/**: Custom middleware (auth, validation, etc.)
- **utils/**: Helper functions and utilities
- **config/**: Configuration management

## Running the Application

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

### Backend (Node.js/Express)
```bash
cd backend
npm install
npm start
```

### Production (Next.js)
```bash
npm install
npm run dev
```

## Features

✅ Secure file sharing with encryption
✅ Device binding (first device only)
✅ Expiring links with custom expiration dates
✅ Download limits and tracking
✅ Copy/paste/screenshot protection
✅ Real-time access logging
✅ Role-based access control (Viewer/Editor)
✅ Watermarking and content protection
✅ User authentication with Supabase

## Technology Stack

- **Frontend**: React, JSX, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Production**: Next.js 16, Turbopack

## Environment Variables

Create `.env.local` in the root directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## License

MIT
