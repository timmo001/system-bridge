package server

import (
	"context"
	"fmt"
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/logger"
	"github.com/timmo001/system-bridge/websocket"
)

// Listen on port 7972 (T9: SYSB)
const addr = ":7972"

type Server struct {
	Channel chan bool
	Logger  *log.Logger
	Cancel  context.CancelFunc
}

func NewServer(channel chan bool) *Server {
	l := logger.CreateLogger("server")
	return &Server{
		Channel: channel,
		Logger:  l,
	}
}

func (s *Server) Start() {
	s.Logger.Info(fmt.Sprintf("Listen at: %s", addr))

	http.HandleFunc("/websocket", websocket.WebSocket)
	assert.NoError(http.ListenAndServe(addr, nil), "Server stopped unexpectedly")
}
