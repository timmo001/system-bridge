pip install --upgrade setuptools wheel pyinstaller

pip install -r requirements_windows.txt

Invoke-WebRequest `
  -Uri https://raw.githubusercontent.com/timmo001/system-bridge-backend/master/systembridgebackend/__main__.py `
  -OutFile backend.py

pyinstaller `
  --clean `
  --noconfirm `
  --onedir `
  --windowed `
  --icon "resources/system-bridge.ico" `
  --name "systembridgebackend" `
  --collect-all "plyer" `
  --collect-all "pywin32" `
  --collect-all "winsdk" `
  --collect-all "systembridgeshared" `
  --collect-all "systembridgebackend" `
  --collect-all "systembridgefrontend" `
  --collect-all "systembridgewindowssensors" `
  backend.py

Invoke-WebRequest `
  -Uri https://raw.githubusercontent.com/timmo001/system-bridge-cli/master/systembridgecli/__main__.py `
  -OutFile cli.py

pyinstaller `
  --clean `
  --noconfirm `
  --onedir `
  --icon "resources/system-bridge.ico" `
  --name "systembridgecli" `
  --collect-all "systembridgeshared" `
  --collect-all "systembridgecli" `
  cli.py
