# Smart Crime Analytics Dashboard

**Live Demo:** [smart-crime-analytics-dashboard.vercel.app](https://smart-crime-analytics-dashboard.vercel.app/)

Version 1.0: historical Indian metropolitan crime analytics and locally imported district FIR analysis. Original metro figures are preserved; the former mock district records are removed.

## Run

For immediate use, open the root `index.html` in your browser. The included `vendor/` folder supplies charts and map libraries offline; keep it alongside the HTML files. No installation is required for this option.

For a reproducible build and local server, use Node.js 20+ and npm:

```sh
npm ci
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173. Publishable files are in `dist/`; opening `dist/index.html` directly also works. The build refreshes the bundled libraries in both the root `vendor/` folder and `dist/vendor/`. No API key, database, or paid service is required.

## Features

- Violent-crime annual trend, calculated percentage changes, and CSV export.
- All 19 city totals and 15 violent-crime categories: search, sorting, top-10/all selection, charts, tables, and exports.
- Summary cards calculated from the same metro dataset as the charts.
- Real district CSV/JSON import with validation, district/year/stage filters, annual volumes, station rankings, recorded case stages, demographic coverage, and summary export.
- Optional OpenStreetMap markers for supplied coordinates; offline coordinate table.
- Responsive layouts, keyboard navigation, empty/error states, and chart-independent tables.

## Data integrity and scope

`data/metro.json` contains the original project figures: 2019–2021 violent incidents, 2022 IPC totals for 19 cities, and 2022 counts for 15 violent-crime categories. `assets/data.js` is the identical browser-loadable copy for serverless local use. Update both when changing data; tests verify agreement and preservation of the original values.

The three original government source links are retained in the dataset and app. They timed out during verification on 2026-09-06. These are **preserved project transcriptions, not independently reverified figures**. No replacement or missing values were invented.

IPC and violent incidents are different measures. Do not combine them. Counts are not population-adjusted risk scores. Imported district results describe only the supplied sample; missing years do not establish zero crime.

No real district dataset or live case API was present in the repository. District analysis therefore starts empty. Live case updates, immediate spike notifications, reliable hotspot forecasting, and patrol optimization require a maintained data source and validated models. They are not simulated or advertised as operational in this release.

## District import

Use the empty CSV template from the district page, or a JSON array. No sample FIR data is bundled. Use one row per FIR, not one row per victim or accused.

| Field | Rule |
| --- | --- |
| `District_Name`, `FIR_Stage`, `UnitName` | Required nonempty text |
| `FIR_Year` | Required integer year, 1900 through current year |
| `Male`, `Female`, `Boy`, `Girl` | Optional nonnegative integer counts |
| `Accused_Count`, `Arrested_Count` | Optional nonnegative integer counts; arrested cannot exceed accused when both are known |
| `FIR_Type` | Optional text; blank becomes Unknown |
| `Latitude`, `Longitude` | Optional paired coordinates in valid ranges |

Limits: 20 MB and 100,000 records. An invalid record rejects the entire new import; the previous valid dataset remains available. Missing optional counts stay unknown, and coverage is displayed. Annual percentage change requires a consecutive observed year and nonzero baseline. Repeated analysis rows are retained with a warning because different FIRs can share the same fields. Extra fields are discarded. Standardize source spellings to combine district, station, and stage labels.

Files stay in browser memory. Clear or reload discards the active data; explicitly downloaded CSV files remain on your device. Imported labels are rendered as text; CSV formula prefixes are neutralized. Map tiles are requested only after pressing **Load online map tiles**, revealing the viewed area to OpenStreetMap without uploading the file. The map shows up to 3,000 distinct locations, and the coordinate table shows up to 500 records. Summary calculations include all selected records. Supplied coordinates can represent stations rather than incident locations.

## Vercel deployment

Vercel is the primary hosting target. The root `vercel.json` configures:

| Setting | Value |
| --- | --- |
| Framework preset | Other (`null`) |
| Install command | `npm ci` |
| Build command | `npm test && npm run build` |
| Output directory | `dist` |

To redeploy this linked checkout from the command line:

```sh
npx vercel deploy --prod
```

For automatic deployments after GitHub pushes, first add your GitHub account under Vercel account **Login Connections**, then connect this repository in the Vercel project's Git settings and select the production branch. The initial production release was deployed directly from the CLI; automatic GitHub linking was blocked by the missing login connection. Git integration is separate from a command-line deployment. No environment variables are required. Vercel serves only the static build; district uploads remain in the visitor's browser. `.vercel/` contains local account/project linkage and is excluded from Git. `.vercelignore` excludes local examples and generated/dependency folders from source uploads.

## GitHub Pages (optional alternative)

1. Push the reviewed source and lockfile to GitHub.
2. In repository **Settings → Pages**, choose **GitHub Actions** as source.
3. Run **Deploy dashboard to GitHub Pages** from the Actions tab.

The optional manual workflow validates, builds, and deploys only `dist/`; it does not run automatically. CI validates pushes and pull requests. Relative links support repository subpath hosting. On other static hosts, upload the contents of `dist/`.

## Verification and maintenance

`npm test` covers CSV quoting, malformed input, unknown counts, missing baselines, duplicate warnings, original data preservation, routes, ranking controls, import/filter/clear, malicious labels, and rejected-upload recovery. Synthetic test fixtures are confined to tests and never published. DOM tests verify behavior and chart fallback; they do not substitute for visual browser checks or live map-provider verification.

`npm run build` bundles Chart.js 4.4.3 and Leaflet 1.9.4 locally, with licenses. Charts and analysis need no network. Source links and optional map tiles require internet. A final release is a stable snapshot; external sources, browsers, and dependencies may still change.

## Contributors

- K Karthik Pai
- Ajay Bhat
- Sanjeev N M
- P V P K Karthik

## License

Project code: MIT (`LICENSE.txt`). Bundled Chart.js and Leaflet retain their MIT and BSD licenses. Source data and map tiles remain subject to their publishers' terms and attribution.
