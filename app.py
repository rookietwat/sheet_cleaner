from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import os
import uuid
from sheet_cleaner import smart_cleaner_controller

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
upload_dir = os.path.join(BASE_DIR, "uploads")
output_dir = os.path.join(BASE_DIR, "outputs")
static_dir = os.path.join(BASE_DIR, "static")

os.makedirs(upload_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)
os.makedirs(static_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

def delete_files(upload_path, output_path):
    if os.path.exists(upload_path):
        os.remove(upload_path)

    if os.path.exists(output_path):
        os.remove(output_path)


@app.get("/", include_in_schema = False)
async def home():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.post("/clean")
async def clean_excel(background_tasks: BackgroundTasks, file: UploadFile = File(), name = Form(), columns: str = Form(), options: str = Form()):
    
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls", ".ods", ".csv")):
        raise HTTPException(status_code=400, detail="Upload only valid spreadsheet files.")
 
    _, ext = os.path.splitext(file.filename)
    upload_name = f"{uuid.uuid4()}{ext.lower()}"
    output_name = f"{uuid.uuid4()}.xlsx"

    upload_path = os.path.join(upload_dir, upload_name)
    output_path = os.path.join(output_dir, output_name)

    with open(upload_path, "wb") as excel_file:
        excel_file.write(await file.read())

    try:
        if ext.lower() == ".csv":
            df = pd.read_csv(upload_path)
        else:
            df = pd.read_excel(upload_path, sheet_name=name)
    except Exception:
        if os.path.exists(upload_path):  
            os.remove(upload_path)
        raise HTTPException(status_code=400, detail="Unable to read Excel file.")

    selected_columns = [col.strip() for col in columns.split(",") if col.strip()]

    chosen_options = [opt.strip() for opt in options.split(",") if opt.strip()]

    cleaned_df = smart_cleaner_controller(df, selected_columns, chosen_options)

    cleaned_df.to_excel(output_path, index=False)

    background_tasks.add_task(delete_files, upload_path, output_path)

    return FileResponse(path=output_path, filename="cleaned_file.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
