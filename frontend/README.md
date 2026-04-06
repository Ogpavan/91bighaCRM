# CRM Frontend

Frontend for a CRM dashboard built with **React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components**.

## Tech Stack

- React 18
- Vite
- TypeScript
- React Router v6
- Tailwind CSS
- shadcn/ui-style component primitives
- Lucide + React Icons (Font Awesome icons in sidebar)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## App Routes

### Dashboard Layout Routes

All routes below are rendered inside `DashboardLayout`:

- `/` -> Dashboard
- `/leads` -> All Leads
- `/leads/add` -> Add Lead
- `/leads/upload` -> Upload Leads
- `/tasks/my` -> My Tasks
- `/tasks/all` -> All Tasks
- `/users` -> Users
- `/teams` -> Teams
- `/reports` -> Reports
- `/settings` -> Settings

### Auth Routes

- `/signin` -> Sign In page
- `/signup` -> Sign Up page

## Project Structure

```text
src/
  components/
    AuthShell.tsx
    DashboardLayout.tsx
    Navbar.tsx
    Sidebar.tsx
    ui/
      avatar.tsx
      badge.tsx
      button.tsx
      card.tsx
      input.tsx
  pages/
    Dashboard.tsx
    Reports.tsx
    Settings.tsx
    SignIn.tsx
    SignUp.tsx
    leads/
      AddLead.tsx
      AllLeads.tsx
      UploadLeads.tsx
    tasks/
      AllTasks.tsx
      MyTasks.tsx
    teams/
      Teams.tsx
      Users.tsx
  App.tsx
  main.tsx
  index.css
```

## Layout Overview

### Sidebar

- Fixed/desktop sidebar with mobile drawer behavior
- Desktop collapse/expand support
- `NavLink` active styles:
  - left blue border (`border-l-4 border-l-blue-600`)
  - blue text/background
- Collapsed mode shows icon-only navigation with tooltips on hover

### Navbar

- Compact top bar
- Sidebar open button (mobile)
- Sidebar expand/collapse button (desktop)
- Search input
- Notifications + profile dropdown

### Main Content

- `Outlet`-based routing
- Scrollable content area
- Compact spacing for dense dashboard UI

## Styling System

- Atlassian-inspired blue/white palette
- Sharp corners (`rounded-sm`)
- Subtle borders and small shadows
- Compact typography and spacing for data-heavy layouts
- Global font: **IBM Plex Sans**

## Notes

- Path aliases use `@/` -> `src/`
- Tailwind config is in `tailwind.config.js`
- Global styles and CSS variables are in `src/index.css`
- Router setup is in `src/App.tsx`

## Future Improvements

- Expand backend coverage beyond authentication
- Add pagination/filter/sort for leads and tasks
- Add testing (unit + integration)
