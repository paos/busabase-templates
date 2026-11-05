# Project Roadmap

Canonical AirApp source for the reusable template. Projects contain milestones; anyone
with edit access may complete or reopen them. Schedule changes are explicit review proposals.

The app uses the viewer’s Busa session and resolves only stamped resources belonging to
this installation. Each page reads at most 50 projects and 50 milestones; Load more fetches
one additional page. Live errors never switch to sample data. No credentials are shipped.

## Development checks

```sh
npm ci
npm run check
npm run dev
```

For an isolated browser check, install Chromium with `npx playwright install chromium`,
then run `npm run test:browser` while the preview is running. It explicitly uses demo mode,
including completion, reopening, project creation, date proposals and a 390px layout.
`ROADMAP_PREVIEW_URL` changes the preview URL; `BROWSER_EXECUTABLE` selects an existing browser.
Real-data acceptance must also run the installed app inside Busa.

`npm run build:sdk` regenerates vendored browser bundles from the exact SDK version.
The server’s standalone OAuth boundary is the official SDK gateway; hosted Runs use
the viewer’s ambient session. No local data store is used for live workflow state.

## Reusable package

From the template root, run `node scripts/sync-content.mjs --check` and
`npx busabase-cli@latest check . --strict`. Schema and samples are declared in
`app/js/config.js` and `app/js/demo-data.js`; regenerate content rather than editing
Base declarations independently. The template supports one installation per Space;
ambiguous resource ownership is an explicit setup error.

## Milestone scheduling

Drag a milestone bar to move its full interval; drag either edge to adjust its start
or finish. Release reviews the dates and dependencies together. Escape cancels the
preview. Click a milestone name to open its details, then choose **Dates & dependencies**. Clicking a bar opens the schedule editor directly, and arrow keys
offer a keyboard alternative (Shift changes the step to a week).

Dependency chips show selected names with removal controls. Search adds prerequisites.
Start after dependencies preserves duration. Circular dependencies block submission;
downstream conflicts are shown without automatic cascading changes. All schedule
proposals preserve canonical records until reviewed.

Run `npm run test:scheduling` against the preview to exercise mouse, touch, keyboard,
resizing, cancellation, dependency edits, cycle prevention and combined review submission.
After updating an installed AirApp, use Busa's Stop then Run controls to ensure the
new source is loaded, including on server versions with the Restart reattachment bug.
