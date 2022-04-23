"""System Bridge"""
import sys
from systembridgebackend.__main__ import Main as Backend
from systembridgegui.__main__ import Main as GUI

if len(sys.argv) > 1:
    if "--backend" in sys.argv:
        Backend()
    elif "--gui" in sys.argv:
        GUI()
    else:
        Backend()
else:
    Backend()
