# Career import picker

Import controls in Settings, new-career setup and the load-error recovery screen no longer restrict files by extension or MIME type. Device file pickers can exclude JSONL or renamed downloads when those filters are set. The existing reader identifies and validates legacy JSON and multipart portable backups by their contents instead.

A successful import closes the new-career wizard, opens the imported dashboard, clears stale view selections and reports the chosen filename. Busy/error notices are brought into view and import progress uses the current operation message. An invalid import retains the worker's previously loaded career so the player can continue advancing without reloading.

Validation: actual Chromium file-chooser interactions imported legacy JSON from initial setup, a portable backup with an unknown extension/MIME type from Settings, a renamed text backup from the new-career wizard and an extensionless backup from the load-error screen. A malformed file was rejected while preserving player horse IDs, exact funds and a working Next Day. All five existing multipart save-format tests and the production build passed.
