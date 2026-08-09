# Code Quality & Refactoring TODOs

Based on the recent frontend architecture review, here are the actionable tasks to modernize and stabilize the vanilla JS codebase:

## 1. Implement Centralized State Management
- [ ] Replace global variables (`uiMode`, `selectedIndex`, `historyItems`, etc.) with a single reactive state object.
- [ ] Use a JavaScript `Proxy` or a lightweight Pub/Sub pattern so that state mutations automatically trigger necessary UI updates, rather than relying on manual function calls (e.g., calling `renderItems()` manually).

## 2. Refactor DOM Rendering Strategy
- [ ] **Implement Event Delegation:** Remove inline event listeners (`click`, `mouseenter`, `mouseleave`) from inside the list generation loop. Attach a single listener to `.item-list` and use event bubbling (`e.target.closest`) to handle interactions.
- [ ] **Stop DOM Shredding:** Modify `renderItems()` so it doesn't completely destroy and recreate the DOM on every state change (like typing in the search bar). 
- [ ] Consider soft-hiding non-matching elements with CSS (e.g., `display: none`) during searches to preserve scroll state and avoid layout thrashing.

## 3. Improve the Theming & Design Token System
- [ ] Expand the JavaScript theme dictionaries to include semantic variables (e.g., `--surface-default`, `--surface-hover`, `--border-subtle`, `--input-bg`) instead of just `bg`, `card`, and `text`.
- [ ] Remove hardcoded alpha-transparent overlays (like `rgba(128, 128, 128, 0.1)`) from `style.css` in favor of these explicit theme tokens. This will ensure perfect contrast across both light and dark themes.

## 4. Optimize Popup Positioning Logic
- [ ] Wrap the `showPreview()` bounding box calculations (`getBoundingClientRect`) inside a `requestAnimationFrame` to prevent synchronous layout thrashing on slower machines.
