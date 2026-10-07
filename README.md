# LeadFlow

LeadFlow is a multi-tenant lead and document management platform that I built using React, Node.js, Express and MongoDB for mortgage brokerages. It has four user roles with JWT authentication and brokerage-level data isolation. I implemented lead management, a fixed pipeline, duplicate detection, Tally webhook integration, background jobs with a MongoDB worker, Socket.IO for live updates, lead-to-client conversion, document upload and checking, a dashboard, email automation and task automation. For external services, I used Cloudinary for document storage and Nodemailer with Mailtrap for email testing. I kept the overall architecture simple for the assignment and used MongoDB jobs instead of adding a separate queue system. I also added version-based checks so two advisors cannot silently overwrite each other’s stage updates.
There are still a few areas that I would improve before using the project in a real production environment. For example, the worker can have recovery issues if it crashes during a job, webhook requests are not rate-limited yet, duplicate detection can still have a race condition when two requests come at exactly the same time, dashboard updates are not fully real-time for every create or delete action, and documents are currently uploaded one at a time. The Tally integration has already been tested with a real form submission. Next, I would focus on better job recovery and idempotency, rate limiting, more complete real-time dashboard updates, more automated testing, tighter file access control and better production monitoring.
Technology\*\*
| Part | Choice |
| --- | --- |
| Frontend | React, Vite, JavaScript |
| API | Node.js, Express, JavaScript |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcrypt |
| Live updates | Socket.IO |
| Background work | MongoDB job collection and a separate worker process |
| Documents | Cloudinary |
| Email | Nodemailer, Mailtrap sandbox |
| External leads | Tally webhook |
There is no Redis. The worker polls MongoDB.

## What each role can do

| Role            | Access                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- |
| Platform admin  | Signs in. Does not belong to a brokerage and does not see that brokerage’s leads.        |
| Brokerage admin | Dashboard, leads, tasks, task rules, and email templates for one brokerage.              |
| Advisor         | Dashboard, leads, and tasks for one brokerage. Can complete only tasks assigned to them. |
| Client          | Signs in and sees only their own case. Can upload documents for that case.               |

There is no public signup page. Staff accounts come from the seed. A client account for a real case is created when a brokerage admin or advisor converts a lead in the **Won** stage. The temporary password is shown once.

## Pipeline

Stages are fixed:
`New` → `Contacted` → `Documents requested` → `In review` → `Won` / `Lost`
A stage change sends the current version. If someone else already changed that lead, the API returns `409`. The same stage does not queue another email or task.

## Project layout

```
frontend/     React app
backend/      Express API, worker, and seed script
```

The API listens on `PORT` (default `5000`). Health check: `GET /api/health`.

## Local setup

Use Node.js 20 or newer. You need a MongoDB Atlas database named `leadflow`.

1. Install dependencies.

```powershell
cd backend
npm install
cd ../frontend
npm install
```

2. Create `backend/.env` and fill in the values from the sections below. Do not commit this file.
3. Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

4. Seed the demo brokerages and users. This deletes existing users and brokerages, so do not run it again after you have real leads.

```powershell
cd backend
npm run seed
```

5. Start three processes, each in its own terminal.

```powershell
cd backend
npm run dev
```

```powershell
cd backend
npm run worker
```

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173.
`npm run dev` restarts the API when code changes. It does not reload `.env`. Restart the API and the worker after you change `backend/.env`.
Production-style commands, without file watch:

```powershell
cd backend
npm start
```

```powershell
cd frontend
npm run build
npm run preview
```

Set `VITE_API_URL` before `npm run build`. Vite bakes that value into the frontend.

## Environment variables

Put backend values in `backend/.env` only.
| Variable | Purpose |
| --- | --- |
| `PORT` | API port. Default `5000`. |
| `MONGO_URI` | MongoDB Atlas connection string for the `leadflow` database. |
| `JWT_SECRET` | Secret used to sign login tokens. |
| `JWT_EXPIRES_IN` | Token lifetime. Default `12h`. |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS and Socket.IO. Local value: `http://localhost:5173`. |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` for Mailtrap Email Testing. |
| `SMTP_PORT` | `2525` |
| `SMTP_USER` | Mailtrap sandbox SMTP username. |
| `SMTP_PASS` | Mailtrap sandbox SMTP password. |
| `MAIL_FROM` | From address. Example: `LeadFlow <noreply@leadflow.test>`. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. |
Frontend:
| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, such as `http://localhost:5000`. |
Do not put SMTP or Cloudinary values in `frontend/.env`.

## Demo sign-in

Every seeded account uses the password `Password123!`.
| Role | Email |
| --- | --- |
| Platform admin | platform@leadflow.test |
| Northbridge admin | admin.northbridge@leadflow.test |
| Northbridge advisor | advisor.northbridge@leadflow.test |
| Northbridge client | client.northbridge@leadflow.test |
| Southgate admin | admin.southgate@leadflow.test |
| Southgate advisor | advisor.southgate@leadflow.test |
| Southgate client | client.southgate@leadflow.test |
The seeded clients are not linked to a lead. To try **My Case** and document upload, convert a **Won** lead and use the one-time password from that conversion.
Webhook secrets created by the seed:
| Brokerage | `x-webhook-secret` |
| --- | --- |
| Northbridge | `northbridge-webhook-secret` |
| Southgate | `southgate-webhook-secret` |

## Mailtrap

LeadFlow uses Mailtrap’s sandbox inbox, not live delivery. Open **Email Testing**, then your sandbox, then **SMTP Settings**, then **Nodemailer**. Copy the username and password into `SMTP_USER` and `SMTP_PASS`.
Keep:

```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
```

Restart the worker after saving. With the worker running, this queues one email for the newest Northbridge lead that has an email address:

```powershell
cd backend
npm run email:test
```

Look in that same Mailtrap sandbox inbox. A missing username or password fails the email job with a clear configuration error. It does not undo a pipeline stage change.

## Cloudinary

Client uploads go to Cloudinary. `Document.fileUrl` stores the secure `https` URL. `Document.fileName` keeps the original name.
In the Cloudinary dashboard, open **Settings**, then **API Keys**. Copy the cloud name, API key, and API secret into `backend/.env`. Restart the API.
Files are stored under `leadflow/{brokerageId}/{leadId}`. If a Cloudinary variable is missing, the upload returns `500` and no document is created.
The upload returns immediately. The worker then sets the document to **Checking** for about 10–20 seconds, then **Verified** or **Failed**.

## Tally

Create a Tally form with these three questions:
| Tally question | Tally field type | LeadFlow field |
| --- | --- | --- |
| Name, Full name, or Your name | Short text | `name` |
| Email | Email | `email` |
| Phone number | Phone number | `phone` |
Every Tally lead is saved with `source` set to `tally`. A `brokerageId` in the body is ignored. The brokerage comes from `x-webhook-secret`.
Tally sends a `FORM_RESPONSE` payload. LeadFlow reads `data.fields`:

```json
{
  "eventType": "FORM_RESPONSE",
  "data": {
    "responseId": "2wgx4n",
    "fields": [
      { "label": "Full name", "type": "INPUT_TEXT", "value": "Greta Hoffmann" },
      { "label": "Email", "type": "INPUT_EMAIL", "value": "greta@example.com" },
      {
        "label": "Phone number",
        "type": "INPUT_PHONE_NUMBER",
        "value": "+491511112233"
      }
    ]
  }
}
```

The same `responseId` is accepted only once for a brokerage. A later submission with the same email uses the normal duplicate check and does not add a second active pipeline card.
Tally cannot call `http://localhost:5000`. A real form needs a public `https` API.

1. Publish the form.
2. Open **Integrations**, then **Webhooks**, then **Connect**.
3. Endpoint URL: `https://YOUR-PUBLIC-HOST/api/webhooks/leads`
4. Add the header `x-webhook-secret` with that brokerage’s webhook secret.
5. Submit the form once.
6. Sign in as that brokerage and open **Leads**. The card is in **New** and its source is `tally`.

### Test the webhook on this computer

Start the API and the worker, then send:

```powershell
$body = @{
  eventType = "FORM_RESPONSE"
  data = @{
    responseId = "local-test-1"
    fields = @(
      @{ label = "Full name"; type = "INPUT_TEXT"; value = "Greta Hoffmann" }
      @{ label = "Email"; type = "INPUT_EMAIL"; value = "greta@example.com" }
      @{ label = "Phone number"; type = "INPUT_PHONE_NUMBER"; value = "+491511112233" }
    )
  }
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/webhooks/leads -Headers @{ "x-webhook-secret" = "northbridge-webhook-secret" } -ContentType "application/json" -Body $body
```

The response is `202` with `Lead accepted`. The worker then creates one Northbridge lead. Sending that same `responseId` again returns `202` with `Lead already accepted`.
A missing or unknown `x-webhook-secret` returns `401`.

## Deployment

On Render, `npm start` runs the API and, because `NODE_ENV` is `production`, starts the same worker inside that process. Locally, keep the API and worker as separate processes. Build the frontend separately.
API:

```powershell
cd backend
npm install
npm start
```

Worker:

```powershell
cd backend
npm run worker
```

Frontend:

```powershell
cd frontend
npm install
npm run build
```

Serve the `frontend/dist` folder. Set these for the deployed environment:

- `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- `PORT`
- `CLIENT_ORIGIN` to `https://leadflow-frontend-steel.vercel.app`
- `VITE_API_URL` to `https://leadflow-7cxt.onrender.com` before the frontend build
- Cloudinary variables on the API process
- SMTP variables on the worker process
  After the API has a public `https` URL, connect Tally as described above.
  `backend/.env` is listed in `.gitignore`. Do not commit it.
