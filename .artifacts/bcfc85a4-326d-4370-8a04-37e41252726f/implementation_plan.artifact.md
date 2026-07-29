# Implementation Plan - Admin Dashboard

Create a dashboard for admin, viewer, and approval roles that provides a summary of candidates based on category, field, and progress status.

## User Review Required

> [!IMPORTANT]
> The dashboard will be the new landing page for admins after login. The existing "Data Kandidat" page will still be accessible via the navigation bar.

## Proposed Changes

### [Admin Dashboard Component]

#### [NEW] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/page.js)
- Implement the Dashboard UI.
- Fetch candidate data from Firestore.
- Calculate statistics for `kategoriKandidat`, `bidangKerja`, and `statusProgres`.
- Display summary cards and simple visual indicators (e.g., progress bars or percentage bars).

### [Navigation & Routing]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/page.js)
- Update the redirect logic for `admin`, `viewer`, and `approval` roles to point to `/admin` instead of `/admin/candidates`.

#### [MODIFY] [Navbar.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/components/Navbar.js)
- Add a "Dashboard" link to the navigation bar for administrative roles.

## Verification Plan

### Manual Verification
- Log in as an admin and verify redirection to `/admin`.
- Check if the dashboard displays correct counts for categories, fields, and statuses.
- Verify that navigation between Dashboard and Data Kandidat works correctly.
- Check responsiveness on mobile and desktop.
