# GroupMaker

GroupMaker is a one-page, browser-based tool for turning a class roster into
useful student groups. Teachers import a CSV, confirm the relevant columns,
choose a group structure and strategy, and generate classroom-ready groups.

The central privacy promise is simple:

> Roster data stays on the teacher's device.

The current starter has no backend, database, analytics, or third-party
JavaScript. CSV files are read into browser memory and are not uploaded.

## Current features

- Drag-and-drop or file-picker CSV import
- CSV parsing, including quoted fields and escaped quotation marks
- Automatic suggestions for name and performance columns
- Groups by number of groups or students per group
- Pure random grouping
- Balanced-performance grouping
- High-low distribution
- Similar-readiness grouping
- Copy and print results
- Responsive layout for laptops, tablets, and phones
- No build step and no external dependencies

## Project files

```text
GroupMaker/
├── index.html      # Page structure and interface
├── styles.css      # Responsive design and print styles
├── app.js          # CSV parsing, grouping, and interactions
├── sample-roster.csv
├── LICENSE
└── README.md
```

## Run locally

You can double-click `index.html` and use most features immediately.

For the most reliable browser behavior, serve the directory locally:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

No package installation is required.

## Expected CSV format

The app accepts any CSV with a header row and at least one usable student-name
column. For example:

```csv
Student Name,Current Grade,Absences,Birth Month
Alex Rivera,91,2,March
Jordan Lee,74,6,November
```

The teacher confirms which column contains student names and may optionally
choose a numeric performance column. Percentage signs are accepted.

Do not place a real student roster in this public GitHub repository. Use the
included fictional sample only for testing.

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Add these files at the repository root.
3. Commit and push the files to the `main` branch.
4. Open the repository's **Settings**.
5. Select **Pages** in the sidebar.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and `/ (root)` folder, then save.

GitHub will provide a public address similar to:

```text
https://YOUR-USERNAME.github.io/GroupMaker/
```

Because all file references are relative, the site works both on a project
Pages URL and at a custom domain.

## Privacy model

The app currently:

- reads selected files with the browser `File` API;
- holds parsed rows in a JavaScript object in the active tab;
- makes no `fetch`, `XMLHttpRequest`, WebSocket, or form-submission requests;
- does not use cookies, local storage, session storage, IndexedDB, or analytics;
- clears its in-memory roster when the page refreshes, closes, or **Start over**
  is selected.

GitHub still serves the static website files and may log ordinary page-request
metadata. The student's CSV contents are never sent to GitHub by this app.

If future versions add analytics, error reporting, fonts, libraries, or other
third-party resources, review them carefully so the local-only promise remains
accurate.

## Grouping logic

- **Pure random:** Fisher-Yates shuffle followed by round-robin distribution.
- **Balanced performance:** sort from highest to lowest, then use a serpentine
  distribution across groups.
- **High-low distribution:** alternate from the high and low ends of the sorted
  list before distributing students.
- **Similar readiness:** sort students and place adjacent performance values in
  the same groups.

These are teacher-support tools, not recommendations about which students
should work together. The interface intentionally hides individual scores from
the group cards.

## Recommended next milestones

1. Add attendance-column interpretation.
2. Add same-value and spread-value grouping for teacher-selected columns.
3. Add a teacher-led support group with a selectable size.
4. Add keep-together and keep-apart constraints.
5. Add absent-student filtering.
6. Add drag-and-drop movement between generated groups.
7. Add group locking and rerolling.
8. Add downloadable CSV and printer-friendly name cards.
9. Add automated tests for CSV edge cases and grouping invariants.
10. Add an offline-capable service worker once the core behavior is stable.

## Accessibility notes

The starter uses native form controls, visible keyboard focus, semantic
headings, an ARIA live region for generated groups, and responsive layouts.
Before a public launch, test with keyboard-only navigation, zoom at 200%, and
at least one screen reader.

## License

This starter uses the MIT License. Replace the copyright holder in `LICENSE`
if desired.
