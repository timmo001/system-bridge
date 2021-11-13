import sys
from PySide6 import QtCore, QtWidgets, QtGui
from PySide6.QtWebEngineWidgets import QWebEngineView


class MyWidget(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()

        self.browser = QWebEngineView(self)
        self.browser.load(QtCore.QUrl("https://timmo.dev"))

        self.layout = QtWidgets.QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.layout.addWidget(self.browser)


if __name__ == "__main__":
    app = QtWidgets.QApplication([])

    widget = MyWidget()
    widget.resize(800, 600)
    widget.show()

    sys.exit(app.exec())
