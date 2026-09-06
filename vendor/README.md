# Browser libraries

These checked-in files let root HTML pages work offline without running npm first.
Do not omit this folder when sharing or publishing the root pages.

- Chart.js 4.4.3: copied from the pinned npm package (MIT).
- Leaflet 1.9.4: copied from the pinned npm package (BSD-2-Clause).

License files are included here. `npm run build` refreshes these files from the
locked dependencies and copies them into `dist/vendor/` for the built release.
