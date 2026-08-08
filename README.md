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
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from your [Cloudinary console](https://cloudinary.com/console) (free tier is fine). Required for any admin image/video upload — product photos, category cover photos, bundle/offer images, the UGC gallery, and the homepage hero video/image.

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

## Deployment (Vercel)

The app deploys to Vercel as a single serverless function (`api/index.js`) that wraps the Express app; `vercel.json` rewrites every request to it, so the same app serves both the API and the static storefront/admin files.

1. **Push to GitHub** (if not already) and import the repo in the [Vercel dashboard](https://vercel.com/new) — no framework preset needed, Vercel auto-detects the Node function under `api/`.
2. **Set environment variables** in the Vercel project settings (Settings → Environment Variables) — the same ones from `.env.example`: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_EXPIRES_DAYS`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and optionally the `SMTP_*` ones. Set `NODE_ENV=production`.
3. **Deploy.** Once it's live at `https://<your-project>.vercel.app`, set `CLIENT_URL` to that same URL (in Environment Variables) and redeploy, so the CORS allowlist matches — the initial deploy doesn't know its own URL in advance.
4. **Seed the database once**, from your machine, pointed at the production `MONGO_URI` (there's no build-time hook for this): `MONGO_URI=<prod-uri> npm run seed`.
5. MongoDB Atlas must allow connections from Vercel's IPs — easiest is enabling "Allow access from anywhere" (`0.0.0.0/0`) in Atlas Network Access, since Vercel's serverless functions don't have static outbound IPs on the free/hobby tier.

**Known limitation:** Vercel serverless functions cap request body size well under the app's 25MB hero-video upload limit (roughly 4.5MB on Hobby/Pro). Product/category/bundle/offer/gallery image uploads (5MB cap, well under the limit) are unaffected; a hero video larger than a few MB will be rejected by Vercel before it reaches the app. Keep hero videos small and compressed, or ask to add a direct-to-Cloudinary client upload for that one field if it becomes a problem.

## Notes

- Prices are always recomputed server-side at checkout — the client never sends a total.
- All admin-uploaded images/video (products, categories, bundles, offers, gallery, hero media) go to Cloudinary, not local disk — required for serverless hosts like Vercel, where local writes don't persist. See `server/middleware/upload.js` and `server/config/cloudinary.js`.
- `.env` is gitignored — never commit real secrets. Use `.env.example` as the template for what's required.
