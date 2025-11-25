# Run and prepare the Python FastAPI server
param(
  [int]$Port = 8000
)

# go to server folder
Set-Location -Path (Join-Path $PSScriptRoot '..\server')

# create venv if missing
if (-not (Test-Path .\venv)) {
    python -m venv venv
}

# activate
. .\venv\Scripts\Activate.ps1

# install dependencies (safe, will skip if already installed)
pip install --upgrade pip
pip install -r requirements.txt

# run uvicorn
python -m uvicorn main:app --reload --host 0.0.0.0 --port $Port
