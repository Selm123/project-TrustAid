@echo off
setlocal
if not exist .venv\Scripts\python.exe (
  py -3 -m venv .venv || python -m venv .venv
)
call .venv\Scriptsctivate
python -m pip install -U pip
python -m pip install -r requirements.txt
set PYTHONPATH=.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
endlocal