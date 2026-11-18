# Sheet Cleaner

A modern, fast, and user-friendly spreadsheet cleaning tool built with **FastAPI**, **Pandas**, and vanilla HTML/CSS/JS. Easily sanitize messy Excel and CSV spreadsheets with customizable data cleaning rules.

## Features

- **Remove Formulas**: Strips out formula prefixes (`=`) and converts dynamic cells to plain static values.
- **Standardize Dates**: Parses and normalizes various date formats into a unified style (`DD/MM/YY` or `DD-MM-YY`).
- **Remove Accents & Diacritics**: Replaces accented Unicode characters with their standard ASCII equivalents (e.g., `é` -> `e`).
- **Clean Extra Spaces**:
  - Removes invisible zero-width spaces (`\u200B`) and web non-breaking spaces (`\xa0`).
  - Trims leading and trailing spaces.
  - Collapses multiple consecutive spaces into a single space.
  - Fixes hyphen spacing (e.g. `X - Ray` -> `X-Ray`).
  - Normalizes commas and removes duplicate punctuation.
- **Remove Apostrophes**: Strips leading and stray apostrophes/curly quotes from text columns.
- **Interactive Web Interface**:
  - Drag-and-drop file upload (`.xlsx`, `.xls`, `.ods`, `.csv`).
  - Sheet selection for multi-sheet workbooks.
  - Granular column selection: pick which columns to apply operations to.
  - Dark / Light theme toggle.
  - Instant file download upon cleaning.
- **Privacy & Cleanup**: Uploaded files and generated exports are automatically deleted immediately after processing via background tasks.

## Project Structure

```
├── app.py               # FastAPI backend with upload and processing endpoints
├── sheet_cleaner.py     # Pandas cleaning controller and operations
├── requirements.txt     # Python dependencies
├── static/
│   ├── index.html       # Web application UI
│   ├── styles.css       # Clean styling with dark mode support
│   └── app.js           # Frontend logic, file drag-and-drop & API calls
└── .gitignore           # Ignores venv, temp uploads/outputs, and data files
```

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rookietwat/sheet_cleaner.git
   cd sheet_cleaner
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**:
   ```bash
   uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```

5. Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

## Tech Stack

- **Backend**: FastAPI, Uvicorn, Pandas, openpyxl, xlrd, odfpy, regex, titlecase
- **Frontend**: HTML5, CSS3, JavaScript (SheetJS for client-side workbook previews)
