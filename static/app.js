const themeSlider = document.querySelector("#theme-slider");
const currentTheme = localStorage.getItem("theme");

if (currentTheme) {
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (currentTheme === "dark") {
        themeSlider.checked = true;
    }
}

themeSlider.addEventListener("change", function(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
    }
});

const operations = [
  { value: "remove_formulas", label: "Remove formulas", help: "Converts formula results to static text" },
  { 
    value: "standardize_dates", 
    label: "Standardize dates", 
    help: "Formats valid dates",
    subOptions: [
      { label: "Use Slashes (DD/MM/YY)", value: "slashes" },
      { label: "Use Dashes (DD-MM-YY)", value: "dashes" }
    ]
  },
  { value: "remove_accents", label: "Remove accents", help: "Replaces accented characters (e.g., é to e)" },
  { value: "extra_space_remover", label: "Clean extra spaces", help: "Removes double spaces and fixes word gaps" },
  { value: "remove_apostrophe", label: "Remove apostrophes", help: "Strips apostrophes from text" },
];

const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const fileName = document.querySelector("#file-name");
const selectionArea = document.querySelector("#selection-area");
const sheetSelect = document.querySelector("#sheet-select");
const columnsList = document.querySelector("#columns-list");
const operationsArea = document.querySelector("#operations-area");
const operationsList = document.querySelector("#operations-list");
const previewArea = document.querySelector("#preview-area");
const previewTable = document.querySelector("#preview-table");
const cleanButton = document.querySelector("#clean-button");
const resetButton = document.querySelector("#reset-button");

let selectedFile;
let workbook;
let selectedColumns = new Set();
let selectedOperations = new Set();
let dateStyle = "slashes";

// Drag and drop support
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event("change"));
    }
});

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;

  if (!file) return;
  if (!/\.(xlsx|xls|ods|csv)$/i.test(file.name)) {
    showToast("Please choose an .xlsx, .xls, .ods, or .csv file.", true);
    fileInput.value = "";
    return;
  }

  try {
    selectedFile = file;
    fileName.textContent = file.name;
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    renderSheets();
    loadSheet(workbook.SheetNames[0]);
    selectionArea.hidden = false;
    resetButton.hidden = false;
  } catch {
    selectedFile = undefined;
    selectionArea.hidden = true;
    showToast("The workbook could not be read. Please try another Excel file.", true);
  }
});

sheetSelect.addEventListener("change", () => loadSheet(sheetSelect.value));

document.querySelector("#select-all-columns").addEventListener("click", () => {
  const names = getSheetRows()[0] || [];
  const uniqueHeaders = names.filter((header, index) => header !== "" && names.indexOf(header) === index);
  
  const allSelected = selectedColumns.size === uniqueHeaders.length;
  selectedColumns = allSelected ? new Set() : new Set(uniqueHeaders);
  
  // Update existing checkboxes without rebuilding the DOM
  const checkboxes = columnsList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
      cb.checked = !allSelected;
  });
  
  updateSelectAllButton(uniqueHeaders);
  updateOperationsVisibility();
  updateCleanButton();
});

cleanButton.addEventListener("click", cleanWorkbook);

resetButton.addEventListener("click", () => {
    selectedFile = undefined;
    workbook = undefined;
    selectedColumns = new Set();
    selectedOperations = new Set();
    fileInput.value = "";
    fileName.textContent = "No file selected";
    selectionArea.hidden = true;
    resetButton.hidden = true;
    cleanButton.disabled = true;
    sheetSelect.replaceChildren();
    columnsList.replaceChildren();
    operationsList.replaceChildren();
    previewTable.replaceChildren();
});

function renderSheets() {
  sheetSelect.replaceChildren(...workbook.SheetNames.map((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  }));
}

function loadSheet(sheetName) {
  selectedColumns = new Set();
  const rows = getSheetRows(sheetName);
  const headers = rows[0] || [];
  renderColumns(headers);
  renderPreview(headers, rows.slice(1, 51)); // Show 50 rows to make sticky header useful
  updateOperationsVisibility();
  updateCleanButton();
}

function getSheetRows(sheetName = sheetSelect.value) {
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  const firstDataRowIndex = rawRows.findIndex(row => row.some(cell => cell.toString().trim() !== ""));
  return firstDataRowIndex === -1 ? [] : rawRows.slice(firstDataRowIndex);
}

function renderColumns(headers) {
  columnsList.replaceChildren();
  const uniqueHeaders = headers.filter((header, index) => header !== "" && headers.indexOf(header) === index);

  if (!uniqueHeaders.length) {
    columnsList.textContent = "This sheet has no header row to select.";
    return;
  }

  uniqueHeaders.forEach((header) => {
    const checkbox = createCheckbox(header, selectedColumns.has(header), (checked) => {
      checked ? selectedColumns.add(header) : selectedColumns.delete(header);
      updateOperationsVisibility();
      updateCleanButton();
    });
    columnsList.append(checkbox);
  });
  
  updateSelectAllButton(uniqueHeaders);
}

function updateSelectAllButton(uniqueHeaders) {
  const btn = document.querySelector("#select-all-columns");
  if (!uniqueHeaders.length) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  const allSelected = selectedColumns.size === uniqueHeaders.length;
  btn.textContent = allSelected ? "Deselect all" : "Select all";
}

function updateOperationsVisibility() {
  operationsArea.hidden = selectedColumns.size === 0;
  if (selectedColumns.size > 0 && !operationsList.childElementCount) renderOperations();
}

function renderOperations() {
  operationsList.replaceChildren();
  operations.forEach(({ value, label, help, subOptions }) => {
    
    const container = document.createElement("div");
    container.className = "operation-container";
    container.style.marginBottom = "8px";
    
    const wrapper = createCheckbox(label, selectedOperations.has(value), (checked) => {
      checked ? selectedOperations.add(value) : selectedOperations.delete(value);
      updateCleanButton();
    }, help);
    
    container.append(wrapper);
    
    if (subOptions) {
        const subGroup = document.createElement("div");
        subGroup.className = "sub-options";
        subGroup.style.display = selectedOperations.has(value) ? "block" : "none";
        subGroup.style.marginLeft = "24px";
        subGroup.style.marginTop = "8px";

        subOptions.forEach(sub => {
            const radioWrap = document.createElement("label");
            radioWrap.className = "radio-item";
            radioWrap.style.display = "flex";
            radioWrap.style.alignItems = "center";
            radioWrap.style.gap = "8px";
            radioWrap.style.marginBottom = "4px";
            radioWrap.style.cursor = "pointer";
            radioWrap.style.fontSize = "0.9em";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `${value}_sub`;
            radio.value = sub.value;
            radio.checked = dateStyle === sub.value;
            radio.addEventListener("change", (e) => {
                if (e.target.checked) dateStyle = sub.value;
            });

            radioWrap.append(radio, document.createTextNode(sub.label));
            subGroup.append(radioWrap);
        });

        wrapper.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
            subGroup.style.display = e.target.checked ? "block" : "none";
        });

        container.append(subGroup);
    }
    operationsList.append(container);
  });
}

function createCheckbox(label, checked, onChange, helpText = null) {
  const wrapper = document.createElement("label");
  wrapper.className = "checkbox-item";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  
  const textContainer = document.createElement("div");
  textContainer.className = "checkbox-text";
  
  const labelSpan = document.createElement("div");
  labelSpan.className = "checkbox-label";
  labelSpan.textContent = label;
  textContainer.append(labelSpan);
  
  if (helpText) {
      const help = document.createElement("div");
      help.className = "help-text";
      help.textContent = helpText;
      textContainer.append(help);
  }
  
  wrapper.append(input, textContainer);
  return wrapper;
}

function renderPreview(headers, rows) {
  previewTable.replaceChildren();
  if (!headers.length) {
    previewArea.hidden = true;
    return;
  }
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const cell = document.createElement("th");
    cell.textContent = header;
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((_, index) => {
      const cell = document.createElement("td");
      cell.textContent = row[index] ?? "";
      tr.append(cell);
    });
    body.append(tr);
  });
  previewTable.append(head, body);
  previewArea.hidden = false;
}

function updateCleanButton() {
  cleanButton.disabled = !selectedFile || !selectedColumns.size || !selectedOperations.size;
}

async function cleanWorkbook() {
  const cleanBtnText = cleanButton.querySelector(".btn-text");
  const cleanSpinner = cleanButton.querySelector(".spinner");

  cleanButton.disabled = true;
  cleanBtnText.textContent = "Cleaning...";
  cleanSpinner.hidden = false;

  const data = new FormData();
  data.append("file", selectedFile);
  data.append("name", sheetSelect.value);
  data.append("columns", [...selectedColumns].join(","));
  
  const finalOptions = [...selectedOperations];
  if (finalOptions.includes("standardize_dates")) {
      finalOptions.push(`date_style_${dateStyle}`);
  }
  data.append("options", finalOptions.join(","));

  try {
    const response = await fetch("/clean", { method: "POST", body: data });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || "Cleaning failed.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaned_file.xlsx";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Your cleaned workbook is downloading.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    cleanBtnText.textContent = "Clean & download";
    cleanSpinner.hidden = true;
    updateCleanButton();
  }
}

function showToast(message, isError = false) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    container.append(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
