//go:build windows
// +build windows

package notification

import (
	"fmt"
	"os/exec"
)

func send(data NotificationData) error {
	script := `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
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
$xml.LoadXml($template -f "%s", "%s")
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("System Bridge")
$notifier.Show($toast)
`
	script = fmt.Sprintf(script, data.Title, data.Message, data.Title, data.Message)
	cmd := exec.Command("powershell", "-Command", script)
	return cmd.Run()
}
