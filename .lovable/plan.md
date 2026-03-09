

## UI/UX Polish Plan

After reviewing the full application, here are the issues and improvements organized by category:

### 1. Font Consistency Fix
- **Problem**: `index.css` line 180-182 sets h1/h2/h3 to `'Playfair Display', serif` — a serif font that's never imported and conflicts with General Sans heading intent.
- **Fix**: Remove that rule so headings use the `font-heading` (General Sans) class already applied throughout components.

### 2. Journey Tracker — Full Width
- **Problem**: Phase nodes use `min-w-[100px]` with small `w-6` connectors, leaving the tracker clustered to the left instead of stretching across the card.
- **Fix**: Make each phase node `flex-1` and connectors `flex-1` so the tracker distributes evenly across the full container width.

### 3. Contrast & Color Improvements
- **Muted foreground** (`0 0% 40%`) is borderline for WCAG AA on the light background. Bump to ~35% lightness for better readability.
- **Status strip labels** at `text-[11px]` are too small — increase to `text-xs` (12px).
- **Card borders** are very subtle — slightly darken `--border` for better definition.

### 4. Card & Component Polish
- Add subtle `hover:shadow-md transition-shadow` to interactive cards (tasks, deliverables) for better affordance.
- Increase card padding consistency — some cards use `p-4`, others `p-6`. Standardize task/deliverable rows.
- Add `group` hover states to task rows so the arrow icon gets highlighted on hover.

### 5. Animation Refinements
- Wrap the Hero Status Strip items in staggered `motion.div` for a cohesive entrance (currently only the "Next Step" card animates).
- Add subtle scale on the "Start" button hover via `hover:scale-[1.02] active:scale-[0.98]` transition.

### 6. Top Bar & Layout Polish
- Add a greeting in the top bar header area: "Good morning, {firstName}" for warmth.
- Slightly increase header height from `h-14` to `h-16` for more breathing room.
- Add a subtle bottom shadow to the sticky header instead of just a border.

### 7. Button Refinements
- Add `transition-all duration-200` and slight shadow to primary buttons for depth.
- The "View" ghost buttons on deliverables are low contrast — switch to `variant="outline"` with smaller size.

### 8. Welcome Page
- Add the logo above the welcome heading for brand consistency.
- Increase spacing between steps for better visual rhythm.

---

### Files to modify:
1. **`src/index.css`** — Remove Playfair Display rule, adjust `--muted-foreground` and `--border` values
2. **`src/pages/client/Dashboard.tsx`** — Full-width journey tracker, staggered animations, hover states, greeting header, card polish
3. **`src/components/layout/AppLayout.tsx`** — Add greeting, improve header styling
4. **`src/pages/Welcome.tsx`** — Add logo, spacing improvements
5. **`src/components/ui/button.tsx`** — Add transition-all for smoother interactions
6. **`src/pages/client/Tasks.tsx`** — Hover state improvements on task cards
7. **`src/pages/client/Updates.tsx`** — Minor contrast/spacing tweaks

