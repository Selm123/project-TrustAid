@echo off
setlocal
set PYDIR=C:\Python313
if not exist "%PYDIR%\python.exe" (
  echo Expecting %PYDIR%\python.exe but not found. Falling back to PATH python.
  call run.bat
  goto :eof
)
"%PYDIR%\python.exe" -m pip install -U pip
"%PYDIR%\python.exe" -m pip install -r requirements.txt
set PYTHONPATH=.
"%PYDIR%\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
endlocal