# Implementation Plan - Interactive Admin Dashboard

Make dashboard elements clickable to filter the candidate list automatically.

## User Review Required

> [!NOTE]
> Clicking on a status card, a "Bidang Kerja" item, or a "Kategori" item will navigate the admin to the "Data Kandidat" page with that specific filter already active.

## Proposed Changes

### [Admin Dashboard]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/page.js)
- Import `Link` from `next/link`.
- Wrap the "Total Kandidat" card with a link to `/admin/candidates`.
- Wrap status cards with links to `/admin/candidates?status=[status]`.
- Wrap "Bidang Kerja" items with links to `/admin/candidates?bidang=[bidang]`.
- Wrap "Kategori" items with links to `/admin/candidates?kategori=[kategori]`.
- Update styles to ensure clickable elements look interactive (hover effects).

### [Candidate Data Page]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/candidates/page.js)
- Import `useSearchParams` from `next/navigation`.
- Use a `useEffect` hook to read `bidang`, `kategori`, and `status` from search parameters when the component mounts or when search parameters change.
- Update the state variables `filterBidang`, `filterKategori`, and `filterStatus` based on the URL parameters.
- Wrap the component or the part using `useSearchParams` with `Suspense` if required by Next.js (usually needed for `useSearchParams` in some Next.js configurations).

## Verification Plan

### Manual Verification
- Go to the Dashboard.
- Click on the "On Proses" card. Verify it redirects to "Data Kandidat" and only shows candidates with "On Proses" status.
- Click on a specific Bidang (e.g., "KAIGO"). Verify it redirects and filters correctly.
- Click on a Kategori (e.g., "NEW COMER"). Verify it redirects and filters correctly.
- Verify that clicking "Lihat Detail Semua Kandidat" still works (shows all).
