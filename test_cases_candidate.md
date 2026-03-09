# Candidate Component Comprehensive Test Cases

## 1. Authentication & Onboarding (Client-Specific Portal)
*   **[✅ SUCCESS] TC-CA-AUTH-01:** Verify Candidate can securely sign up (`POST /api/candidate/{slug}/signup`) on a specific Client's branded portal using the Client's unique subdomain slug.
*   **[✅ SUCCESS] TC-CA-AUTH-02:** Verify Candidate registration automatically initializes GDPR consent timestamps (`gdpr_consent` and `gdpr_consent_date`).
*   **[✅ SUCCESS] TC-CA-AUTH-03:** Verify Candidate cannot register multiple times with the same email for the same Client.
*   **[✅ SUCCESS] TC-CA-AUTH-04:** Verify Candidate can successfully log in (`POST /api/candidate/{slug}/login`) and receives a JWT token scoping their access securely to the specific `client_id` they registered under.
*   **[✅ SUCCESS] TC-CA-AUTH-05:** Verify Candidate can update their password (`PUT /api/candidate/password`), enforcing a minimum length of 6 characters.

## 2. Profile & CV Management
*   **[✅ SUCCESS] TC-CA-PROF-01:** Verify Candidate can fetch and update their comprehensive profile (`PUT /api/candidate/me`), including complex fields like `skills`, `remote_preference`, and `salary_expectation`.
*   **[✅ SUCCESS] TC-CA-PROF-02:** Verify Candidate can upload a CV (`POST /api/candidate/cv/upload`) with valid extensions (.pdf, .doc, .docx, .txt).
*   **[✅ SUCCESS] TC-CA-PROF-03:** Verify CV upload successfully interfaces with Cloudflare R2 storage, returning a valid `storage_path` / object key.
*   **[✅ SUCCESS] TC-CA-PROF-04:** Verify the background AI parser automatically extracts text from the CV and correctly auto-populates empty profile fields (e.g., auto-filling missing `years_of_experience`, `skills`, or generating an `ai_summary`).
*   **[✅ SUCCESS] TC-CA-PROF-05:** Verify Candidate can download their previously stored CVs by generating a short-lived R2 presigned URL (`GET /api/candidate/cv/{cv_id}/download`).
*   **[✅ SUCCESS] TC-CA-PROF-06:** Verify Candidate can delete their CV (`DELETE /api/candidate/cv/{cv_id}`), which removes the record from the DB and triggers deletion from R2 storage.

## 3. Job Exploring & Applications (Authenticated)
*   **[✅ SUCCESS] TC-CA-APP-01:** Verify Candidate can view all open jobs specifically belonging to the Client they are associated with (`GET /api/candidate/jobs`).
*   **[✅ SUCCESS] TC-CA-APP-02:** Verify the open jobs list correctly merges with application history, flagging boolean `already_applied` to true for specific requirements.
*   **[✅ SUCCESS] TC-CA-APP-03:** Verify Candidate can apply to an open job (`POST /api/candidate/jobs/{job_id}/apply`), appending an `Applicant` record linked to the `Requirement`.
*   **[✅ SUCCESS] TC-CA-APP-04:** Verify the Candidate cannot apply to the same job twice (HTTP 400).
*   **[✅ SUCCESS] TC-CA-APP-05:** Verify Candidate can track their historical applications (`GET /api/candidate/applications`), fetching the requirement details and current pipeline `status`.

## 4. Public Job Board (Unauthenticated)
*   **[✅ SUCCESS] TC-CA-PUB-01:** Verify an unauthenticated user can list all open jobs globally (`GET /api/public/jobs`) and filter them by `location`, `remote_type`, or keyword search.
*   **[✅ SUCCESS] TC-CA-PUB-02:** Verify an unauthenticated user can fetch details of a specific global job (`GET /api/public/jobs/{job_id}`).
*   **[✅ SUCCESS] TC-CA-PUB-03:** Verify a direct file upload application via the public route (`POST /api/public/apply`) successfully triggers `parse_cv_and_save` via FastAPI's `BackgroundTasks`, without blocking the request loop.

## 5. Candidate ↔ Admin Messaging
*   **[✅ SUCCESS] TC-CA-MSG-01:** Verify Candidate can fetch their direct message history with the Client Admins (`GET /api/candidate/messages`).
*   **[✅ SUCCESS] TC-CA-MSG-02:** Verify requesting the message history automatically parses and flags `is_read = True` for unread Admin messages.
