# nomnom

Grocery/list PWA — color-coded pill-shaped items that flow inline, grouped by category, with check-off, item memory, real-time sync, and list sharing.

Inspired by [Idealist](https://apps.apple.com/us/app/id971870098), a now-expired iOS grocery list app with color-coded categories and a visual, tap-to-check-off design.

## Repository
- Remote: git@github.com:micahmorgan1/nomnom.git
- Default branch: main

## Network / Deployment
- Host server: VM at 10.52.10.36 (home network)
- Port: 3002 (3001 was taken by a root-owned process, likely DDEV)
- The UI will typically be accessed from other machines on the network, not from this server directly.
- Serve on 0.0.0.0 (not localhost) so the app is reachable at 10.52.10.36:3002 from other devices.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (PWA via vite-plugin-pwa)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Knex.js (designed for easy PostgreSQL migration later)
- **Real-time:** Socket.IO
- **Auth:** JWT + bcrypt

## Project Structure
Monorepo with npm workspaces:
- `shared/` — @nomnom/shared: TypeScript types + constants (default categories, colors)
- `server/` — @nomnom/server: Express API + Socket.IO + Knex/SQLite
- `client/` — @nomnom/client: React Vite PWA

## Key UI Concept
Items render as **inline pill elements that flow/wrap like words in a paragraph** (flex-wrap) in a single continuous block — no category headers. Same-color (same-category) pills sit adjacent, sorted alphabetically within each category group. Checked items gray out and move to a collapsible "Inactive" section at bottom. The app remembers items across lists, building a personal library over time.

## Deduplication
- Each item can only appear once per list (UNIQUE constraint on `list_items(list_id, item_id)`)
- Adding an item that's already active → 409 error shown in modal
- Adding an item that's checked/inactive → re-activates it (unchecks, updates qty/notes)

## Categories
- Default categories seeded on first run (see `shared/src/constants.ts`)
- Users can create custom categories inline from the CategoryPicker (name + color from `PRESET_COLORS`)
- POST `/api/categories` — already supported by server

## PWA Icons
- `client/public/icons/` — icon.svg (source), icon-192.png, icon-512.png, apple-touch-icon.png (180px)
- Generated from SVG via cairosvg; regenerate with: `python3 -c "import cairosvg; ..."`
- Apple Touch Icon linked in `client/index.html`

## Menus (Recipes)
Users can save collections of grocery items as named menus (e.g., "Spring Roll Stir Fry") and quickly add them to any list. Items added from a menu get the menu name in their `notes` field.

### Database
- `menus` table — id, name, created_by (FK users, CASCADE), timestamps
- `menu_items` table — id, menu_id (FK menus, CASCADE), item_id (FK items, CASCADE), UNIQUE(menu_id, item_id)

### API Routes
- `GET/POST /api/menus` — list/create menus
- `GET/PUT/DELETE /api/menus/:id` — get/update/delete menu
- `POST /api/lists/:listId/menus/:menuId/add` — add menu items to a list (in `listItems.ts`)
  - Handles dedup: new items inserted with `notes = menu.name`, checked items re-activated, active items get menu name appended to notes
  - Accepts `{ exclude_item_ids?: number[] }` to skip specific items
  - Emits `list:items-added` socket event

### Client Components
- `useMenus` hook — CRUD operations for menus
- `useList.addItemsFromMenu(menuId, excludeItemIds)` — calls the add-to-list endpoint
- `MenuDrawer` — bottom-sheet listing menus, expandable to show ingredient pills with exclude toggles
- `CreateMenuModal` — create/edit modal with name input and item selection from library
- Menu button in ListView bottom bar (left of Pantry)

## Database Migrations
- `server/migrations/001_initial.ts` — all tables
- `server/migrations/002_unique_list_items.ts` — unique constraint on (list_id, item_id)
- `server/migrations/005_menus.ts` — menus + menu_items tables
- Run: `npm run migrate -w @nomnom/server`

## Implementation Plan
Full plan: `~/.claude/plans/fuzzy-giggling-knuth.md`

Phases:
1. Project scaffolding (monorepo, configs, dev tooling)
2. Backend core (database, auth, REST API, Socket.IO)
3. Frontend shell (React app, routing, auth screens, PWA)
4. Core list functionality (CRUD lists, pills, categories)
5. Check-off & memory (item states, library suggestions)
6. Real-time sync (Socket.IO rooms per list)
7. Sharing (share lists by username)
8. Polish (animations, color customization, PWA icons, production deploy)
