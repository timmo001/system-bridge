sudo apt update

sudo apt install -y \
  libayatana-appindicator3-dev \
  libgtk-3-dev \
  libjavascriptcoregtk-4.1-dev \
  librsvg2-dev \  
  libsoup-3.0-dev \
  libwebkit2gtk-4.1-dev

python -m pip install --upgrade setuptools wheel pyinstaller

python -m pip install -r requirements_linux.txt

wget \
  -O backend.py \
  https://raw.githubusercontent.com/timmo001/system-bridge-backend/master/systembridgebackend/__main__.py

pyinstaller \
  --clean \
  --noconfirm \
  --onedir \
  --windowed \
  --icon "resources/system-bridge.png" \
  --name "systembridgebackend" \
  --collect-all "plyer" \
  --collect-all "systembridgeshared" \
  --collect-all "systembridgebackend" \
  --collect-all "systembridgefrontend" \
  backend.py

wget \
  -O cli.py \
  https://raw.githubusercontent.com/timmo001/system-bridge-cli/master/systembridgecli/__main__.py

pyinstaller \
  --clean \
  --noconfirm \
  --onedir \
  --windowed \
  --icon "resources/system-bridge.png" \
  --name "systembridgecli" \
  --collect-all "systembridgeshared" \
  --collect-all "systembridgecli" \
  cli.py
