# Nove

A full-stack e-commerce web app for a nail products business — press-on nails, nail polish, and nail art supplies. Product sales only (no bookings/appointments).

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** Plain HTML/CSS/JavaScript storefront + a separate lightweight admin panel, served as static files from the same Express app
- **Auth:** JWT stored in an httpOnly cookie, bcrypt password hashing
- **File uploads:** Multer, stored locally under `server/uploads/`

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local install, Docker container, or Atlas)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — a long random string
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the seeded admin account

   SMTP variables are optional in development — if left blank, outgoing emails (verification, password reset) are logged to the console instead of sent.

   If you don't have MongoDB installed locally, you can start one with Docker:

   ```bash
   docker run -d --name nove-mongo -p 27017:27017 mongo:7
   ```

3. **Seed the database**

   Creates the admin user plus demo categories (Polish, Press-Ons, Nail Art Supplies) and demo products.

   ```bash
   npm run seed
   ```

   To wipe demo products/categories/customers (keeps the admin user):

   ```bash
   npm run seed:destroy
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   The app is served at `http://localhost:5000` (or your configured `PORT`):
   - Storefront: `http://localhost:5000/index.html`
   - Admin panel: `http://localhost:5000/admin/login.html` (log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`)

## Scripts

| Command              | Description                                   |
| -------------------- | ---------------------------------------------- |
| `npm start`           | Start the server (production)                  |
| `npm run dev`         | Start the server with nodemon (auto-reload)     |
| `npm run seed`        | Seed admin user, categories, and demo products  |
| `npm run seed:destroy`| Remove demo categories/products/customers       |

## Project layout

```
server/       Express app: config, models, controllers, routes, middleware, utils
public/       Storefront static files (HTML/CSS/JS)
public/admin/ Admin panel static files (separate login + dashboard)
```

## Notes

- Prices are always recomputed server-side at checkout — the client never sends a total.
- Uploaded images are stored under `server/uploads/` and served at `/uploads/...`; this directory is gitignored aside from a `.gitkeep`.
- `.env` is gitignored — never commit real secrets. Use `.env.example` as the template for what's required.
