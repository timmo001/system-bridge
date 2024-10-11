package websocket

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/logger"
	"github.com/timmo001/system-bridge/types"
)

// TODO: Add user authentication, so only authenticated users can send messages
// TODO: Check if user is allowed to send messages to other users

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin
		return true
	},
}

type ConnectedClients []types.Client

var connectedClients ConnectedClients

func (cc ConnectedClients) Display() []string {
	var clients []string
	for _, client := range cc {
		clients = append(clients, client.Display())
	}
	return clients
}

func WebSocket(w http.ResponseWriter, r *http.Request) {
	l := logger.CreateLogger("websocket")

	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		l.Debug("Upgrade: %s", err)
		return
	}
	defer c.Close()

	// Add client to connectedClients
	connectedClients = append(connectedClients,
		types.Client{
			Connection: c,
		},
	)
	l.Infof("Client connected: %s", c.RemoteAddr())

	l.Infof("Connected clients: %s", connectedClients.Display())

	for {
		mt, messageIn, err := c.ReadMessage()
		if err != nil {
			l.Debugf("Read: %s", err)
			break
		}
		l.Debugf("Recv: %s", messageIn)

		// Parse JSON
		var request map[string]interface{}
		err = json.Unmarshal(messageIn, &request)
		if err != nil {
			l.Warnf("Error parsing JSON: %s", err)
			// Send error message
			errString := err.Error()
			resp := types.ResponseError{
				Type:    "error",
				Message: "Error parsing JSON",
				Error:   &errString,
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			break
		}

		// Validate JSON contains type
		if _, ok := request["type"]; !ok {
			l.Infof("Error: JSON does not contain type")
			// Send error message
			resp := types.ResponseError{
				Type:    "error",
				Message: "Error: JSON does not contain type",
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			break
		}

		// If type is not "register" or "notification", send error message
		if request["type"] != "register" && request["type"] != "notification" {
			l.Infof("Error: JSON type is not 'register' or 'notification'")
			// Send error message
			resp := types.ResponseError{
				Type:    "error",
				Message: "Error: JSON type is not 'register' or 'notification'",
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			break
		}

		// If type is "register", register client
		if request["type"] == "register" {
			// Validate JSON contains userID
			if _, ok := request["userID"]; !ok {
				l.Infof("Error: JSON does not contain userID")
				// Send error message
				resp := types.ResponseError{
					Type:    "error",
					Message: "Error: JSON does not contain userID",
				}
				message, err := json.Marshal(resp)
				assert.Nil(err, "Error marshalling JSON")

				c.WriteMessage(mt, message)
				break
			}

			// Convert request to ClientRegistration
			clientRegistration := types.RequestRegister{
				UserID: request["userID"].(string),
			}

			// Set userID for client
			alreadyRegistered := false
			for i, client := range connectedClients {
				if client.Connection == c {
					// Check if userID is already registered
					if client.UserID != nil {
						l.Warnf("Error: Client already registered with userID: %s", *client.UserID)
						alreadyRegistered = true
						break
					}

					connectedClients[i].UserID = &clientRegistration.UserID
					break
				}
			}

			l.Infof("Connected clients: %s", connectedClients.Display())

			// Send success message
			var resp types.ResponseSuccess
			if alreadyRegistered {
				resp = types.ResponseSuccess{
					Type:      "register",
					Succeeded: false,
					Message:   "Client already registered",
				}
			} else {
				resp = types.ResponseSuccess{
					Type:      "register",
					Succeeded: true,
					Message:   "Client registered",
				}
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			continue
		}

		// Request type is "notification"

		// Check if client is registered with a userID
		var clientRegistered bool = false
		for _, client := range connectedClients {
			if client.Connection == c && client.UserID != nil {
				clientRegistered = true
				break
			}
		}
		if !clientRegistered {
			l.Infof("Error: Client not registered")
			// Send error message
			resp := types.ResponseError{
				Type:    "error",
				Message: "Error: Client not registered",
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			continue
		}

		// Validate JSON contains message
		if _, ok := request["data"]; !ok {
			l.Infof("Error: JSON is not of type Notification")
			// Send error message
			resp := types.ResponseError{
				Type:    "error",
				Message: "Error: JSON is not of type Notification",
			}
			message, err := json.Marshal(resp)
			assert.Nil(err, "Error marshalling JSON")

			c.WriteMessage(mt, message)
			break
		}

		// // Send message to all clients
		// for _, client := range connectedClients {
		// 	// Only send message to clients that are requested
		// 	if notification.Targets != nil && len(notification.Targets) > 0 {
		// 		found := false
		// 		for _, target := range notification.Targets {
		// 			if (strings.HasSuffix(target, "*") && strings.HasPrefix(*client.UserID, target[:len(target)-1])) || target == *client.UserID {
		// 				found = true
		// 				break
		// 			}
		// 			if target == *client.UserID {
		// 				found = true
		// 				break
		// 			}
		// 		}
		// 		if !found {
		// 			continue
		// 		}
		// 	} else {
		// 		// Don't send if there are no targets
		// 		continue
		// 	}

		// 	err = client.Connection.WriteMessage(mt, messageOut)
		// 	assert.Nil(err, "Error writing message to client")
		// }

		// Send success message
		resp := types.ResponseSuccess{
			Type:      "notificationSent",
			Succeeded: true,
			Message:   "Message sent",
		}
		messageSuccess, err := json.Marshal(resp)
		assert.Nil(err, "Error marshalling JSON")

		// Send success message to client
		err = c.WriteMessage(mt, messageSuccess)
		assert.Nil(err, "Error writing message to client")
	}

	l.Infof("Client disconnected: %s", c.RemoteAddr())

	// Remove client from connectedClients
	for i, client := range connectedClients {
		if client.Connection == c {
			connectedClients = append(connectedClients[:i], connectedClients[i+1:]...)
		}
	}

	l.Infof("Connected clients: %s", connectedClients.Display())
}
