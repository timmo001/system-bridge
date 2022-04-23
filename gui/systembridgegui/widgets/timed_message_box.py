from PySide6 import QtCore, QtWidgets


class TimedMessageBox(QtWidgets.QMessageBox):
    def __init__(
        self,
        timeout=10,
        message=None,
        parent=None,
    ):
        """Initialize"""
        super(TimedMessageBox, self).__init__(parent)
        self.time_to_wait = timeout
        self.message = message
        self.setText(
            f"{f'{self.message} ' if self.message else 'Closing automatically in '}{timeout} seconds."
        )
        self.timer = QtCore.QTimer(self)
        self.timer.setInterval(1000)
        self.timer.timeout.connect(self._timer_changed)
        self.timer.start()

    def _timer_changed(self):
        """Change the content of the message box"""
        self.setText(
            f"{f'{self.message} ' if self.message else 'Closing automatically in '}{self.time_to_wait} seconds."
        )
        self.time_to_wait -= 1
        if self.time_to_wait < 0:
            self.close()

    def closeEvent(
        self,
        event,
    ):
        """Close event"""
        self.timer.stop()
        event.accept()
