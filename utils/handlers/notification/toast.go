package notification

import (
	"encoding/xml"
	"fmt"
	"net/url"
	"strconv"
)

// Windows toasts are built on every platform so their tests run anywhere

type toastXML struct {
	XMLName        xml.Name      `xml:"toast"`
	Launch         string        `xml:"launch,attr"`
	ActivationType string        `xml:"activationType,attr"`
	Duration       string        `xml:"duration,attr,omitempty"`
	Binding        toastBinding  `xml:"visual>binding"`
	Actions        []toastAction `xml:"actions>action,omitempty"`
}

type toastBinding struct {
	Template string      `xml:"template,attr"`
	Image    *toastImage `xml:"image,omitempty"`
	Text     []string    `xml:"text"`
}

type toastImage struct {
	Placement string `xml:"placement,attr"`
	Src       string `xml:"src,attr"`
}

type toastAction struct {
	Content        string `xml:"content,attr"`
	Arguments      string `xml:"arguments,attr"`
	ActivationType string `xml:"activationType,attr"`
}

// activationArguments are what Windows hands back when the notification, or
// one of its buttons, is clicked
func activationArguments(id uint32, action string) string {
	return url.Values{"id": {strconv.FormatUint(uint64(id), 10)}, "action": {action}}.Encode()
}

// parseActivationArguments reads the notification's id and the action
// clicked from activationArguments
func parseActivationArguments(arguments string) (uint32, string, bool) {
	values, err := url.ParseQuery(arguments)
	if err != nil {
		return 0, "", false
	}
	id, err := strconv.ParseUint(values.Get("id"), 10, 32)
	action := values.Get("action")
	if err != nil || action == "" {
		return 0, "", false
	}
	return uint32(id), action, true
}

// buildToast is the notification's toast XML. Every value goes through the
// XML encoder, so text can't change the toast's structure.
func buildToast(id uint32, data NotificationData) (string, error) {
	toast := toastXML{
		Launch:         activationArguments(id, DefaultAction),
		ActivationType: "foreground",
		Binding:        toastBinding{Template: "ToastGeneric"},
	}
	if data.Duration > 0 {
		// Toasts only show for a short or long time, so pick by threshold
		toast.Duration = "short"
		if data.Duration >= 7000 {
			toast.Duration = "long"
		}
	}
	if data.Icon != "" {
		toast.Binding.Image = &toastImage{Placement: "appLogoOverride", Src: data.Icon}
	}
	for _, text := range []string{data.Title, data.Message} {
		if text != "" {
			toast.Binding.Text = append(toast.Binding.Text, text)
		}
	}
	for _, button := range data.Buttons {
		toast.Actions = append(toast.Actions, toastAction{
			Content:        button.Label,
			Arguments:      activationArguments(id, button.ID),
			ActivationType: "foreground",
		})
	}

	encoded, err := xml.Marshal(toast)
	if err != nil {
		return "", fmt.Errorf("encode the toast: %w", err)
	}
	return string(encoded), nil
}
