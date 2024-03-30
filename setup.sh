sudo apt update
sudo apt install \
  python3.12 \
  python3.12-dev \
  python3.12-venv \
  python3.12-distutils

alias python=/usr/bin/python3.12
alias python3=/usr/bin/python3.12

curl -LsSf https://astral.sh/uv/install.sh | sh

sudo apt update
sudo apt install \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

uv venv
source .venv/bin/activate

uv pip install --upgrade setuptools wheel pyinstaller

uv pip install -r requirements_linux.txt

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
