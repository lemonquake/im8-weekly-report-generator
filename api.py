from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from pathlib import Path
from datetime import datetime
import pandas as pd
import traceback

# Import functions from the existing script
try:
    from weekly_report import (
        load_csv, filter_week, aggregate, totals,
        generate_docx_from_scratch, fill_template, DOCX_AVAILABLE
    )
except ImportError as e:
    print(f"Error importing weekly_report: {e}")
    DOCX_AVAILABLE = False

app = FastAPI(title="IM8 Weekly Report API")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

# Mount the static directory to serve the frontend
app.mount("/static", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

@app.get("/")
def read_root():
    return FileResponse(str(STATIC_DIR / "index.html"))

@app.post("/api/generate")
async def generate_report(
    file: UploadFile = File(...),
    top1: str = Form(""),
    format: str = Form("docx")
):
    try:
        # Save the uploaded file to the current directory to preserve it for history
        # We use the original filename to keep the conventions
        safe_filename = file.filename
        if not safe_filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Uploaded file must be a CSV.")
        
        csv_path = BASE_DIR / safe_filename
        with open(csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # ── Process the data (mirroring weekly_report.main) ──
        df_all = load_csv(csv_path)
        week_df, start, end = filter_week(df_all, None)
        
        if week_df.empty:
            raise HTTPException(status_code=400, detail=f"No data found for the selected week ({start.date()} - {end.date()}).")
            
        agg = aggregate(week_df)
        
        if top1:
            top1_name = top1.strip()
            if top1_name not in agg["Affiliate Name"].values:
                available = ", ".join(agg['Affiliate Name'].tolist())
                raise HTTPException(status_code=400, detail=f"'{top1_name}' not found. Available: {available}")
        else:
            if "James DiNicolantonio" in agg["Affiliate Name"].values:
                top1_name = "James DiNicolantonio"
            else:
                top1_name = agg.iloc[0]["Affiliate Name"]
            
        # Build Context
        week_label = f"{start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"
        ctx = {
            "week_label": week_label,
            "week_start": start.strftime("%Y-%m-%d"),
            "week_end": end.strftime("%Y-%m-%d"),
            "totals_all": totals(agg),
            "totals_excl": totals(agg[agg["Affiliate Name"] != top1_name]),
            "csv_filename": csv_path.name,
        }
        
        # ── Generate Report ──
        ext = "xlsx" if format == "excel" else "docx"
        out_filename = f"Weekly_Report_{start.strftime('%Y-%m-%d')}.{ext}"
        out_path = BASE_DIR / out_filename
        
        if format == "excel":
            from weekly_report import generate_excel
            generate_excel(out_path, ctx, top1_name)
            report_filename = out_filename
        else:
            if DOCX_AVAILABLE:
                generate_docx_from_scratch(out_path, ctx, agg, top1_name)
                report_filename = out_filename
            else:
                report_filename = None
            
        return {
            "success": True,
            "context": ctx,
            "report_filename": report_filename,
            "top1_name": top1_name
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{filename:path}")
async def download_file(filename: str):
    file_path = (BASE_DIR / filename).resolve()
    
    # Security check: ensure the file is inside BASE_DIR
    if not str(file_path).startswith(str(BASE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not file_path.exists():
        print(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
    if filename.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
