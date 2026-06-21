# MediConnect - Full Stack Doctor Appointment Booking Web Application

**Live Demo:** [https://appointment-booking-five-inky.vercel.app](https://appointment-booking-five-inky.vercel.app)

MediConnect is a premium, production-ready full-stack web application that allows patients to find doctors, schedule appointments, and process payments securely.


---

## Technical Stack

### Backend
- **Node.js** & **Express.js**: REST API server.
- **MongoDB Atlas** & **Mongoose**: Database modeling.
- **JWT Authentication**: Secure sessions via HttpOnly cookies.
- **Stripe SDK**: Payment processing checkout.
- **Socket.io**: Real-time chats and banner notifications.
- **Nodemailer**: Email verification and receipt delivery.
- **Cloudinary**: Medical record and profile uploads.
- **PDFKit**: Stylized invoice and prescription downloads.

### Frontend
- **React.js** & **Vite**: Rapid, HMR client builds.
- **TailwindCSS**: Premium responsive layouts.
- **Framer Motion**: Smooth animations.
- **Zustand**: Clean state stores.
- **Socket.io Client**: WS socket listener.

---

## Installation & Setup

### 1. Database & Server Setup
Open a terminal in the `backend` folder:
```bash
# Install dependencies
npm install

# Setup environment variables
# Open `.env` and paste your MongoDB Atlas URI, Stripe Secret, and Cloudinary keys:
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/mediconnect
STRIPE_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=...
```

### 2. Seed the Database
Ensure your MongoDB service is running (or Atlas URI is set in `.env`), then run:
```bash
npm run seed
```
This populates the database with:
- **1 Admin** (`admin@mediconnect.com` / `password123`)
- **10 Doctors** (`doctor1@mediconnect.com` to `doctor10@mediconnect.com` / `password123`)
- **20 Patients** (`patient1@mediconnect.com` to `patient20@mediconnect.com` / `password123`)
- **50 Appointments** in completed, accepted, and pending payment states.

### 3. Run Backend Server
```bash
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).

### 4. Run Frontend Client
Open a new terminal in the `client` folder:
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
The frontend will start on [http://localhost:5173](http://localhost:5173).

---

## Key Credentials for Testing
After running the database seeder, you can log in with:
- **Admin**: `admin@mediconnect.com` / `password123`
- **Doctor**: `doctor1@mediconnect.com` / `password123`
- **Patient**: `patient1@mediconnect.com` / `password123`

---

## Vercel Deployment

For monorepo client deployment on Vercel:
1. In the Vercel project settings, set the **Root Directory** to `client`.
2. Vercel will automatically detect the Vite config and build the React app correctly.

