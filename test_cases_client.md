# Client Component Comprehensive Test Cases

## 1. Authentication & Team Access
*   **[✅ SUCCESS] TC-CL-AUTH-01:** Verify Client Owner can securely sign up (`POST /api/client/auth/signup`), which automatically generates a unique subdomain (handling duplicates) and an API key.
*   **[✅ SUCCESS] TC-CL-AUTH-02:** Verify Client Owner can log in successfully with valid credentials and receive JWT access/refresh tokens.
*   **[✅ SUCCESS] TC-CL-AUTH-03:** Verify Client User (team member) can log in, and their permissions securely map to the parent Client's data context.
*   **[✅ SUCCESS] TC-CL-AUTH-04:** Verify account blocks after 5 failed login attempts for both Owner and Team Members, locking out for 1 hour.
*   **[✅ SUCCESS] TC-CL-AUTH-05:** Verify Client Owner can update their profile information, notification settings, and securely change their password.
*   **[✅ SUCCESS] TC-CL-AUTH-06:** Verify Client Owner can cleanly regenerate their API Key (`POST /api/client/auth/me/regenerate-api-key`).

## 2. Company Context & AI Branding
*   **[✅ SUCCESS] TC-CL-COMP-01:** Verify Client can explicitly update `company_name`, `company_description`, and `company_data` to rebuild the context provided to the Assistant.
*   **[✅ SUCCESS] TC-CL-COMP-02:** Verify Client can upload documents (PDF/DOCX/TXT) to populate `company_data`, and the AI assistant hot-swaps seamlessly without restarting the server.
*   **[✅ SUCCESS] TC-CL-COMP-03:** Verify Client can override the AI Assistant's System Prompt (`Custom AI Instructions`).
*   **[✅ SUCCESS] TC-CL-COMP-04:** Verify Client can successfully upload and delete a company logo (validating file size <5MB and type png/jpg/gif).
*   **[✅ SUCCESS] TC-CL-COMP-05:** Verify Client can customize their specific `evaluator_prompt` for CV checks, or revert back to the system default safely.
*   **[✅ SUCCESS] TC-CL-COMP-06:** Verify Client can visually configure "Screening Fields" (e.g., Phone, Age, Salary) which automatically updates and formats the `evaluator_prompt` logic.

## 3. Dashboard Analytics
*   **[✅ SUCCESS] TC-CL-DASH-01:** Verify `/charts` accurately calculates total candidates vs assigned candidates vs available candidates.
*   **[✅ SUCCESS] TC-CL-DASH-02:** Verify the "Roles Distribution" metric identifies and orders the top 10 most common `current_title` values correctly.
*   **[✅ SUCCESS] TC-CL-DASH-03:** Verify `/timeline` accurately fetches candidate growth data based on variable periods (days, months, years) using correct SQL date truncation.

## 4. Requirements (Job Postings)
*   **[✅ SUCCESS] TC-CL-REQ-01:** Verify Client can create, update, and soft-delete a requirement, keeping it securely isolated to their `client_id`.
*   **[✅ SUCCESS] TC-CL-REQ-02:** Verify Client can use AI to build a requirement (`POST /ai-create`) from raw, messy text, accurately parsing elements like Salary Range, Skills, and Experience levels.
*   **[✅ SUCCESS] TC-CL-REQ-03:** Verify Requirement pagination, search (by title/description/location), and priority/status filtering returns correct results (`GET /api/client/requirements`).
*   **[✅ SUCCESS] TC-CL-REQ-04:** Verify Client Admins can assign and unassign specific Requirements to/from specific active `ClientUser` team members.
*   **[✅ SUCCESS] TC-CL-REQ-05:** Verify the Admin Workload Overview (`/workload/overview`) accurately calculates assigned requirements per team member.

## 5. Candidate Management & Smart Search
*   **[✅ SUCCESS] TC-CL-CAND-01:** Verify Client can fetch dynamic filter options (`GET /filter-options`), returning a deduplicated set of available Locations, Titles, Skills, and Ranges based *only* on the client's actual data.
*   **[✅ SUCCESS] TC-CL-CAND-02:** Verify complex multi-dimensional candidate filtering (`POST /filter`) accurately combines `OR` logic within arrays (e.g. nested Skills lists) and `AND` logic across different field types.
*   **[✅ SUCCESS] TC-CL-CAND-03:** Verify "AI Smart Search" (`POST /smart-search`) correctly converts natural language queries (e.g., "Senior Python Devs in London") into structured JSON payload filters natively mapped to the database schema.
*   **[✅ SUCCESS] TC-CL-CAND-04:** Verify candidates matched to a specific Requirement correctly filter down by their application `status`.
*   **[✅ SUCCESS] TC-CL-CAND-05:** Verify CSV export correctly formats Candidate data globally and properly scopes to a specific Requirement if provided.

## 6. AI Tools & Processing
*   **[✅ SUCCESS] TC-CL-AI-01:** Verify the AI Match Score functionality accurately grades the candidate against the job, generating a score, specific reasons, gaps, and a recommendation.
*   **[✅ SUCCESS] TC-CL-AI-02:** Verify the system can queue and process Batch Matches (`POST /match-all`) via BackgroundTasks securely without returning an HTTP timeout.
*   **[✅ SUCCESS] TC-CL-AI-03:** Verify the Client can generate a Candidate Summary (`POST /candidate-summary`) parsing the individual's full mapped attributes.
*   **[✅ SUCCESS] TC-CL-AI-04:** Verify the Client can Ask the CV a Question (`POST /ask-cv`) and accurately retrieve targeted answers.
