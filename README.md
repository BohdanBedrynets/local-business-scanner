# Local Business Scanner

MVP tool for scanning small business websites and detecting basic technical and usability issues.

## Current MVP Features

- Reads websites from CSV
- Opens each website with Playwright
- Scans desktop version
- Scans mobile version
- Takes desktop screenshots
- Takes mobile screenshots
- Checks HTTPS
- Checks response status
- Checks favicon
- Checks viewport meta tag
- Finds PDF links
- Detects desktop horizontal overflow
- Detects mobile content overflow
- Writes results to CSV
- Handles failed websites without stopping the scan
- Shows scan progress and duration

## Input

Input file:

```txt
data/input/sites.csv

Format:

name,url
Example,https://example.com
Google,https://google.com
Output

Results are saved to:

data/output/results.csv

Screenshots are saved to:

data/screenshots/desktop
data/screenshots/mobile
Run
npm run dev
Build
npm run build
npm run start
Project Goal

This project is not only a website scanner.

Long-term goal:

find problems on small business websites;
identify potential clients;
collect market data;
discover business opportunities;
support future SaaS and automation ideas.
MVP Status

MVP v1.0 is completed.