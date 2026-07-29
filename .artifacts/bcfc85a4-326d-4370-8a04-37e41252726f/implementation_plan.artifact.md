# Implementation Plan - Advanced Admin Dashboard

Transform the Admin Dashboard into an interactive, all-in-one management interface with pipeline visualization and dynamic candidate listing.

## User Review Required

> [!IMPORTANT]
> The dashboard will now include the candidate list directly. Clicking on statistics will filter this list instantly without navigating away.

## Proposed Changes

### [Admin Dashboard]

#### [MODIFY] [page.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/app/admin/page.js)
- **Data Management**:
    - Load the full list of candidates on mount.
    - Implement local filtering logic (Search, Status, Bidang, Kategori).
    - Recalculate statistics dynamically based on active filters.
- **UI Components**:
    - **Status Cards**: Update style to match the new design with icons and specific colors. Add a "Belum Ada Status" card.
    - **Pipeline Distribution**: [NEW] Add a horizontal multi-color progress bar showing the distribution of candidates across all stages.
    - **Interactive List**: [NEW] Move the candidate table (similar to the one in `candidates/page.js`) to the bottom of the dashboard.
    - **Dynamic Filtering**: Clicking any card or chart element will update the filter state and the candidate list below.
- **Search & Filters Bar**:
    - [NEW] Add a unified search and filter bar above the table for deep-diving into the data.

### [Components]

#### [NEW] [DashboardTable.js](file:///C:/Users/Lenovo/StudioProjects/cv-portal/src/components/DashboardTable.js) (Optional, but better for refactoring)
- Extract the table logic if it gets too large, but for speed, I might keep it in `page.js` for now to avoid multiple file overhead unless requested.

## Verification Plan

### Manual Verification
- Verify "Belum Ada Status" correctly identifies candidates with no progress status.
- Test clicking "Bidang Kerja" (e.g., KAIGO) -> Verify candidate list filters to KAIGO *and* respects the currently active Status filter.
- Verify the Pipeline Distribution bar accurately reflects the data percentages.
- Test the search bar in the new dashboard table.
- Verify responsiveness on mobile.
