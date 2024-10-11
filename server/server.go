package server

import (
	"fmt"
	"net"

	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/logger"
)

func Start(channel chan bool) {
	// Setup logger
	l := logger.CreateLogger("server")

	// Listen on port 7972 (T9: SYSB)
	port := 7972
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	assert.Nil(err, "Failed to listen on port %d", port)

	l.Info(fmt.Sprintf("Listening on port %v", lis.Addr()))
}
