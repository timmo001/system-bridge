package event_handler

import (
	"reflect"
	"testing"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
)

func TestNotificationEventResponse(t *testing.T) {
	tests := []struct {
		name  string
		event notification.Event
		want  event.ResponseType
	}{
		{"sent", notification.Event{ID: 1, Sent: true, Title: "Title", Message: "Message", Buttons: []notification.NotificationButton{{ID: "snooze", Label: "Snooze"}}}, event.ResponseTypeNotificationSent},
		{"sent without an id", notification.Event{Sent: true, Title: "Title", Message: "Message"}, event.ResponseTypeNotificationSent},
		{"clicked", notification.Event{ID: 1, Action: notification.DefaultAction}, event.ResponseTypeNotificationAction},
		{"closed", notification.Event{ID: 1, Reason: "expired"}, event.ResponseTypeNotificationClosed},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := NotificationEventResponse(tt.event)
			if response.ID != "system" {
				t.Errorf("ID = %q, want system", response.ID)
			}
			if response.Type != tt.want {
				t.Errorf("Type = %q, want %q", response.Type, tt.want)
			}
			data, ok := response.Data.(NotificationEventData)
			if !ok {
				t.Fatalf("Data is %T, want NotificationEventData", response.Data)
			}
			want := NotificationEventData{
				ID:      tt.event.ID,
				Title:   tt.event.Title,
				Message: tt.event.Message,
				Buttons: tt.event.Buttons,
				Action:  tt.event.Action,
				Reason:  tt.event.Reason,
			}
			if !reflect.DeepEqual(data, want) {
				t.Errorf("Data = %+v, want %+v", data, want)
			}
		})
	}
}
