param([string]$Python = "C:\Python313\python.exe")
if (-Not (Test-Path $Python)) { $Python = "python" }
& $Python -m pip install -U pip
& $Python -m pip install -r requirements.txt
$env:PYTHONPATH = "."
& $Python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload