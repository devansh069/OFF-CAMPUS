# College System & Data Management Guide

This document explains the architecture of the Delhi NCR College system, the database tables used, how the APIs work, and how to safely clean up old test data when you are ready.

---

## 1. Database Architecture & Tables

Instead of cluttering active operational data, the system separates **Master Dictionary Data** from **User Operational Data** and **Approval Requests**:

### **A. `college_master` (Master Dictionary Table)**
- **Purpose**: Holds the full master dataset of 2,000+ Delhi NCR Colleges imported from `backend/src/data/delhi_ncr_colleges.xlsx`.
- **Columns**:
  - `college_id` (PK, e.g. `col_ncr_1`)
  - `college_name` (Unique name)
  - `short_name` (Acronym, e.g. `SSC`, `DTU`)
  - `affiliation_university` (e.g. `Delhi University`, `IP University`)
  - `primary_stream` (e.g. `Arts/Science/Commerce`, `Engineering`)
  - `city` (e.g. `Delhi`, `Noida`, `Gurugram`)
  - `ncr_region` (e.g. `Delhi`, `Gautam Buddha Nagar`)
  - `type` (e.g. `Public`, `Private`)

### **B. `colleges` (Active App Colleges Table)**
- **Purpose**: Operational table containing colleges linked to active users, confessions, stories, and fests. Contains geolocation (`latitude`, `longitude`) and official `email_domains`.

### **C. `college_requests` (Unlisted College Submission Queue)**
- **Purpose**: Stores requests submitted by users when their college is not listed in the 2,000 master database.
- **Columns**:
  - `request_id` (PK)
  - `user_id` (Requesting user ID)
  - `college_name` (Name typed by user)
  - `affiliation_university` (Optional)
  - `city` (Optional)
  - `status` (`'pending'`, `'approved'`, `'rejected'`)
  - `admin_notes` (Optional note from admin)

---

## 2. What Has Been Implemented

1. **Automatic 2,000 College Seeder**:
   - `backend/src/scripts/seedColleges.js` automatically runs on server boot and bulk-upserts all 2,000 colleges from `backend/src/data/delhi_ncr_colleges.xlsx` into `college_master`.
2. **Live Search Autocomplete**:
   - `GET /api/colleges/search?q=...` searches `college_master` live by name, acronym, university, or city. Integrated directly into onboarding (`profile-setup.tsx`).
3. **Unlisted College Request Submission**:
   - `POST /api/colleges/request` allows users to submit custom college requests. Sets `user.college_request_status = 'pending'`.
4. **Pure Admin API Endpoints**:
   - `GET /api/admin/college-requests`: List pending requests.
   - `POST /api/admin/college-requests/:requestId/approve`: Approves college, inserts into master & active tables, auto-links requesting user, and unlocks access.
   - `POST /api/admin/college-requests/:requestId/reject`: Rejects the request.
5. **Pending Approval Action Lock**:
   - Users with `college_request_status === 'pending'` can view the app, but swiping, likes, and messaging are locked with a yellow warning banner until Admin approves the request.

---

## 3. How to Clean Up Old Test Data (Whenever You Are Ready)

When you want to remove old test colleges from the early version of the app, follow these simple steps using any MySQL client (e.g., Railway MySQL Console, phpMyAdmin, MySQL Workbench) or running a node script:

### **Step 1: Check Current Old College IDs**
Run this query to view existing colleges linked in `colleges`:
```sql
SELECT college_id, college_name FROM colleges;
```

### **Step 2: Safe Relink & Cleanup Script (Ready-to-Use)**

To clean up old test records safely without breaking existing user foreign key references, run:

```sql
-- 1. Disable foreign key checks temporarily for safe migration
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Optional: Remove test users with dummy colleges (if desired)
-- DELETE FROM users WHERE college_id LIKE 'col_custom_%' OR college_name LIKE '%Test%';

-- 3. Safely delete unused test rows from active colleges table
DELETE FROM colleges WHERE college_id LIKE 'col_custom_%';

-- 4. Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
```

### **Step 3: Reset/Re-seed Master Database (Optional)**

If you ever update `delhi_ncr_colleges.xlsx` with new colleges in the future, simply place the updated file in `backend/src/data/delhi_ncr_colleges.xlsx` and run:

```bash
cd backend
node src/scripts/seedColleges.js
```

This will automatically refresh and sync all colleges without touching any user accounts!
