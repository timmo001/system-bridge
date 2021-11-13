import sys
from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QVBoxLayout, QWidget


class MyWidget(QWidget):
    def __init__(self):
        super().__init__()

        self.browser = QWebEngineView()
        self.browser.load(QUrl("https://timmo.dev"))

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.layout.addWidget(self.browser)


if __name__ == "__main__":
    app = QApplication([])

    widget = MyWidget()
    widget.setWindowTitle("System Bridge")
    widget.setWindowIcon(QIcon("public/system-bridge-circle.png"))
    widget.resize(800, 600)
    widget.show()

    sys.exit(app.exec())
