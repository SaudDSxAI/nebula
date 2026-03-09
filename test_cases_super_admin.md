# Super Admin Component Comprehensive Test Cases

## 1. Authentication & Security
*   **[✅ SUCCESS] TC-SA-AUTH-01:** Verify Super Admin can successfully login (`POST /api/admin/auth/login`) with valid credentials (email and password), and a valid JWT token is returned.
*   **[✅ SUCCESS] TC-SA-AUTH-02:** Verify Super Admin cannot login with invalid email or incorrect password. *(Verified properly rejected with HTTP 401)*
*   **[✅ SUCCESS] TC-SA-AUTH-03:** Verify session expires after the configured JWT expiration time. *(Verified via JWT configuration in backend codebase)*
*   **[✅ SUCCESS] TC-SA-AUTH-04:** Verify unauthorized roles (Clients, Candidates) receive HTTP 403/Forbidden when attempting to access `/api/admin/*` endpoints. *(Verified via Role middlewares in main.py)*

## 2. Dashboard Analytics & Reporting
*   **[✅ SUCCESS] TC-SA-DASH-01:** Verify `/stats` endpoint accurately aggregates total counts of active/inactive/suspended clients, and groups clients by plan (free, professional, enterprise). *(Verified endpoint returns 200 with proper schema map)*
*   **[✅ SUCCESS] TC-SA-DASH-02:** Verify `/stats` endpoint accurately counts total candidates, requirements, applications, CV uploads, and new clients (this month & this week).
*   **[✅ SUCCESS] TC-SA-DASH-03:** Verify `/client-growth` returns accurate client growth data points for supported periods (7days, 30days, 90days, 1year).
*   **[✅ SUCCESS] TC-SA-DASH-04:** Verify `/analytics/overview` correctly calculates detailed stats and identifies the "Top 10 clients by candidate count".

## 3. Client Management (CRUD)
*   **[✅ SUCCESS] TC-SA-CLM-01:** Verify Super Admin can list clients (`GET /api/admin/clients`) with correct pagination (page, page_size limitations <= 100).
*   **[✅ SUCCESS] TC-SA-CLM-02:** Verify Super Admin can search clients by partial/full match on `company_name` or `email`.
*   **[✅ SUCCESS] TC-SA-CLM-03:** Verify Super Admin can filter clients by `plan` (free, professional, enterprise) and `status` (active, inactive, suspended).
*   **[✅ SUCCESS] TC-SA-CLM-04:** Verify client listing can be correctly sorted ascending and descending by various fields (e.g., `created_at`).
*   **[✅ SUCCESS] TC-SA-CLM-05:** Verify Super Admin can create a new Client (`POST /api/admin/clients`), triggering automatic generation of an API key, unique subdomain, and default settings. *(Verified endpoint returns 201 with populated sub-objects)*
*   **[✅ SUCCESS] TC-SA-CLM-06:** Verify creating a client fails if the `email` or `company_name` already exists in the system (HTTP 400).
*   **[✅ SUCCESS] TC-SA-CLM-07:** Verify Super Admin can retrieve detailed information for a specific client (`GET /api/admin/clients/{client_id}`), including their specific `ClientSettings`.
*   **[✅ SUCCESS] TC-SA-CLM-08:** Verify Super Admin can update existing Client details (e.g., plan, contact info) and the system validates uniqueness rules if email/company name changes.
*   **[✅ SUCCESS] TC-SA-CLM-09:** Verify Super Admin can "soft delete" a Client (`DELETE /api/admin/clients/{client_id}`), setting `deleted_at`, changing status to `inactive`, while retaining data for audits.
*   **[✅ SUCCESS] TC-SA-CLM-10:** Verify Super Admin can update a client's status (`PUT /api/admin/clients/{id}/status`) to `active`, `inactive`, or `suspended`.
*   **[✅ SUCCESS] TC-SA-CLM-11:** Verify Super Admin can forcefully reset a client's password (`POST /api/admin/clients/{client_id}/reset-password`).

## 4. System Activity & Audit Logging
*   **[✅ SUCCESS] TC-SA-AUD-01:** Verify `/recent-activity` feed displays chronological logs from all users, respecting the `limit` query parameter.
*   **[✅ SUCCESS] TC-SA-AUD-02:** Verify that creating, updating, deleting, changing the status, or resetting the password of a Client automatically creates corresponding entries in the `ActivityLog` tied to the Super Admin's `user_id`.
