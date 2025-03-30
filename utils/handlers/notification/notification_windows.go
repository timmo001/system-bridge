//go:build windows
// +build windows

package notification

import (
	"fmt"
	"os/exec"
)

func send(data NotificationData) error {
	// Create the PowerShell script that will show the notification
	script := fmt.Sprintf(`
		Add-Type -AssemblyName System.Runtime.WindowsRuntime
		$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
		$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime]

		$templateXml = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>%s</text>
            <text>%s</text>
        </binding>
    </visual>
</toast>
"@

		$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
		$xml.LoadXml($templateXml)
		$toast = New-Object Windows.UI.Notifications.ToastNotification($xml)
		$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Microsoft.Windows.Shell.RunDialog")
		$notifier.Show($toast)
	`, data.Title, data.Message)

	// Execute the PowerShell script
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	return cmd.Run()
}
