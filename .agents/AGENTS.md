# Clinical Nutrilev - AI Rules and Standards

This document contains rules and standards for AI coding assistants working in the `clinical_nutrilev` repository. These rules are automatically loaded by the IDE plugin and must be strictly followed.

---

## 🌐 Language & Style

* **Code & Commits:** ALWAYS write code comments, docstrings, variable/function/class names, and Git commit messages in **English** (using Conventional Commits standard). Conversations and responses can remain in the user's preferred language (Spanish).
* **Code Aesthetics:** Prioritize premium visual aesthetics in the UI. Avoid generic colors; use TailwindCSS custom tokens or the project's styling system (nutri-rose, dark mode variables). Use smooth micro-animations and clean layouts.
* **Component Standards:** Never use standard browser `alert()` popups in frontend controllers. Always inject and use `ToastService` for user-facing errors or achievements.

---

## 🌿 Git & Versioning Flow

* **No Automated Push:** NEVER execute `git push` automatically. Always stage and commit changes locally to the active branch, and explicitly ask the user for permission before pushing to remote repositories.
* **Version Bumping:** Whenever modifications are committed to the frontend list, printing, or core components, increment the patch version in [version.ts](file:///Users/orla09i/Desktop/Projects/clinical_nutrilev/apps/frontend/src/app/version.ts).

---

## 📅 Google Calendar Business Rules

* **Appointment Confirmation Colors:**
  * **Paid Appointment:** If the source `colorId` is Menthe/Mint (`'2'`) or Emerald/Peacock (`'7'`), change it to Lavender/Deep Purple (`'3'`) upon confirmation.
  * **Other Appointments:** Any other color must be changed to Sage/Moss Green (`'10'`) upon confirmation.
  * **Cancellation:** Changing status to cancelled must set the color to Tomato/Red (`'11'`).
* **Synchronization:** Ensure these color mapping rules are mirrored in both the primary NestJS API (`api-main`) and the sibling Python email/WhatsApp webhooks (`automation_nutrilev` repository).

---

## 🎨 Frontend (Angular) Component & Styling Standards

* **Angular Features:** Since we use Angular 21, always write standalone components and use **Signals** (`signal`, `computed`, `effect`) for state management instead of traditional class properties.
* **Component Placement:** Adhere strictly to the Atomic Design component hierarchy under `shared/components/`:
  * `atoms/`: Base elements (buttons, inputs, icons, badges).
  * `molecules/`: Assemblies of elements (search inputs, notification banners).
  * `organisms/`: Complex page sections (tables, detailed records, plans).
* **Routing:** All route components must be loaded lazily in `app.routes.ts` using `loadComponent: () => import(...)`.
* **Styling:** Use Tailwind CSS for standard grid/flex layout and spacing. Scoped component `.css` sheets should be used only for advanced animations or highly custom visuals.

---

## ⚙️ Backend & AI Service Architecture (NestJS & Flask)

* **Supabase Queries (NestJS):** Due to the possibility of historical duplicate emails in tables like `patients`, avoid using `.single()` or `.maybeSingle()` queries on email filters. Use `.select()` and programmatically filter/handle the array inside services to prevent `406 Not Acceptable` or `400` query crashes.
* **Stateless API endpoints:** In multi-worker backend deployment environments (like Render workers/Gunicorn), never use in-memory dictionaries or thread-local variables to track long-running background tasks. Multi-worker systems do not share memory, resulting in random `404 Task not found` errors during polling. All long-running parsed-menu analyses must be stateless synchronous calls or tracked via a database (Supabase).
* **Gemini API Resilience:**
  * The free-tier Gemini API can request backoffs of up to 55 seconds during rate limits.
  * In [ai_service.py](file:///Users/orla09i/Desktop/Projects/clinical_nutrilev/apps/api-python/services/ai_service.py), always cap the wait time for rate limits at **10 seconds**.
  * If the rate limit requests a longer wait, discard the current model immediately and fall back to a lighter model (like `gemini-3.1-flash-lite`) to prevent keeping the connection socket hanging, which triggers Render/Cloudflare proxy timeouts (120s).
* **Google GenAI SDK:** In Python scripts, always use the new `google-genai` SDK (`from google import genai` and `client = genai.Client()`). Do NOT use the deprecated `google-generativeai` package.

---

## 📄 PDF Generation and Layout Rules

* **Mobile Printing Resilience:** Mobile browser wrapper containers break standard `window.print()` rendering. Always generate PDFs directly on the client using `html-to-image` and `jsPDF` imported dynamically (`await import()`) to optimize initial bundle sizes.
* **Parent-Wrapper Clipping:** To avoid blank page captures, never place the capture target container out of screen using `left: -9999px`. Instead, wrap the print container inside a `0x0` pixels fixed parent with `overflow: hidden` and `z-index: -9999`. Keep the target print container child visible and at `opacity: 1` so the browser's layout engine paints it, allowing `html-to-image` to capture it perfectly.
* **No-Cut Category Splitting:** Do not capture the entire list as a single large PNG and slice it mathematically. This cuts text and check cards in half at page breaks. Instead, render and capture the header and each category separately, check their height in millimeters, and use a page height layout calculator in jsPDF to move full categories to a new page if they exceed the remaining space (`y + heightMm > 265` mm).
