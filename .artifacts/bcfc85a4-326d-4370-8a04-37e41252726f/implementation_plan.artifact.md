# Implementation Plan - Updated Status Progress Flow & Dashboard

Update the candidate progress workflow, add a description field for status updates, and reflect these changes on the admin dashboard.

## User Review Required

> [!IMPORTANT]
> The status list will be updated to follow a specific flow: `Nihongo check`, `Belum Lolos Nihongo check`, `Pending Nunggu Job`, `Penjadwalan Interview`, `On Proses`, `Tidak Lolos Interview`, `Status On Job (Selesai)`, and `Cancel`.

## Proposed Changes

### [Admin Candidate Management]

#### [MODIFY] [page.js (Edit)](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/edit/%5Bid%5D/page.js)
- Update the `statusProgres` `<select>` options to include:
    - `Nihongo check`
    - `Belum Lolos Nihongo check`
    - `Pending Nunggu Job`
    - `Penjadwalan Interview`
    - `On Proses`
    - `Tidak Lolos Interview`
    - `Status On Job (Selesai)`
    - `Cancel`
- Add a "Keterangan Progres" textarea field at the bottom of the "Status Progres" tab.

#### [MODIFY] [page.js (Candidates List)](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/candidates/page.js)
- Update the `filterStatus` dropdown options to match the new status list.
- Update the status badge color logic in both Desktop (Table) and Mobile (Card) views.

### [Admin Dashboard]

#### [MODIFY] [page.js (Dashboard)](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/page.js)
- Update `loadDashboardData` to initialize `byStatus` with the complete list of new statuses.
- Update the rendering logic for status cards to accommodate the increased number of statuses (adjusting grid if necessary).

## Verification Plan

### Manual Verification
- Edit a candidate and verify all new status options are available.
- Save a status with a "Keterangan" and verify it persists.
- Go to the "Data Kandidat" page and verify the filter works for new statuses.
- Go to the Dashboard and verify the counts for each new status are correct.
- Verify that clicking a new status card in the dashboard correctly filters the candidate list.
