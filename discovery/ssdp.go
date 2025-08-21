package discovery

import (
	"bytes"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	// SSDPMulticastAddr is the SSDP multicast address
	SSDPMulticastAddr = "239.255.255.250:1900"
	// SSDPSearchTarget is the search target for system-bridge
	SSDPSearchTarget = "urn:schemas-system-bridge:service:api:1"
	// SSDPMaxAge is the maximum age for SSDP cache
	SSDPMaxAge = 1800
)

// SSDPServer represents an SSDP server for service discovery
type SSDPServer struct {
	port          int // SSDP server port (1900)
	backendPort   int // Backend server port for location URLs
	server        *http.Server
	multicastConn *net.UDPConn
	stopChan      chan struct{}
}

// SSDPService represents a discovered SSDP service
type SSDPService struct {
	Location     string
	USN          string
	ST           string
	Server       string
	CacheControl string
	Host         string
	Port         int
}

// NewSSDPServer creates a new SSDP server
func NewSSDPServer(ssdpPort, backendPort int) *SSDPServer {
	return &SSDPServer{
		port:        ssdpPort,
		backendPort: backendPort,
		stopChan:    make(chan struct{}),
	}
}

// Start starts the SSDP server
func (s *SSDPServer) Start() error {
	slog.Info("Starting SSDP server...")

	// Create multicast UDP connection
	addr, err := net.ResolveUDPAddr("udp", SSDPMulticastAddr)
	if err != nil {
		return fmt.Errorf("failed to resolve multicast address: %w", err)
	}

	conn, err := net.ListenMulticastUDP("udp", nil, addr)
	if err != nil {
		return fmt.Errorf("failed to create multicast UDP connection: %w", err)
	}
	s.multicastConn = conn

	// Set connection options
	if err := s.multicastConn.SetReadBuffer(1024 * 1024); err != nil {
		slog.Warn("Failed to set read buffer size", "err", err)
	}

	// Create HTTP server for handling SSDP M-SEARCH responses
	mux := http.NewServeMux()
	mux.HandleFunc("/description.xml", s.handleDescription)
	mux.HandleFunc("/", s.handleRoot)

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	// Start HTTP server in goroutine
	go func() {
		slog.Info("SSDP HTTP server listening", "port", s.port)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("SSDP HTTP server error", "err", err)
		}
	}()

	// Start multicast listener
	go s.listenMulticast()

	// Start periodic announcements
	go s.announceService()

	return nil
}

// Stop stops the SSDP server
func (s *SSDPServer) Stop() error {
	slog.Info("Stopping SSDP server...")

	close(s.stopChan)

	if s.server != nil {
		if err := s.server.Close(); err != nil {
			slog.Error("Failed to close SSDP HTTP server", "err", err)
		}
	}

	if s.multicastConn != nil {
		if err := s.multicastConn.Close(); err != nil {
			slog.Error("Failed to close multicast connection", "err", err)
		}
	}

	return nil
}

// listenMulticast listens for SSDP multicast messages
func (s *SSDPServer) listenMulticast() {
	buf := make([]byte, 2048)

	for {
		select {
		case <-s.stopChan:
			return
		default:
			if err := s.multicastConn.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
				slog.Warn("Failed to set read deadline", "err", err)
				continue
			}

			n, src, err := s.multicastConn.ReadFromUDP(buf)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				slog.Error("Failed to read from multicast", "err", err)
				continue
			}

			message := string(buf[:n])
			s.handleMulticastMessage(message, src)
		}
	}
}

// handleMulticastMessage handles incoming multicast messages
func (s *SSDPServer) handleMulticastMessage(message string, src *net.UDPAddr) {
	lines := strings.Split(message, "\r\n")
	if len(lines) == 0 {
		return
	}

	method := strings.ToUpper(strings.TrimSpace(lines[0]))

	switch method {
	case "M-SEARCH *":
		s.handleMSearch(message, src)
	case "NOTIFY *":
		s.handleNotify(message, src)
	}
}

// handleMSearch handles M-SEARCH requests
func (s *SSDPServer) handleMSearch(message string, src *net.UDPAddr) {
	headers := parseHeaders(message)

	st := headers["ST"]
	if st == "" || (st != "ssdp:all" && st != SSDPSearchTarget) {
		return
	}

	slog.Debug("Received M-SEARCH request", "from", src.String(), "ST", st)

	// Send response
	response := s.createSearchResponse(src.IP.String())
	if _, err := s.multicastConn.WriteToUDP([]byte(response), src); err != nil {
		slog.Error("Failed to send M-SEARCH response", "err", err)
	}
}

// handleNotify handles NOTIFY messages
func (s *SSDPServer) handleNotify(message string, src *net.UDPAddr) {
	headers := parseHeaders(message)
	nts := headers["NTS"]

	switch nts {
	case "ssdp:alive":
		slog.Debug("Received SSDP alive notification", "from", src.String())
	case "ssdp:byebye":
		slog.Debug("Received SSDP byebye notification", "from", src.String())
	}
}

// createSearchResponse creates an M-SEARCH response
func (s *SSDPServer) createSearchResponse(remoteIP string) string {
	hostname, _ := getHostname()

	var buf bytes.Buffer
	buf.WriteString("HTTP/1.1 200 OK\r\n")
	buf.WriteString(fmt.Sprintf("CACHE-CONTROL: max-age=%d\r\n", SSDPMaxAge))
	buf.WriteString("DATE: " + time.Now().UTC().Format(http.TimeFormat) + "\r\n")
	buf.WriteString("EXT: \r\n")
	buf.WriteString(fmt.Sprintf("LOCATION: http://%s:%d/description.xml\r\n", remoteIP, s.backendPort))
	buf.WriteString("SERVER: System-Bridge/1.0 UPnP/1.0\r\n")
	buf.WriteString(fmt.Sprintf("ST: %s\r\n", SSDPSearchTarget))
	buf.WriteString(fmt.Sprintf("USN: uuid:system-bridge-%s::%s\r\n", hostname, SSDPSearchTarget))
	buf.WriteString("\r\n")

	return buf.String()
}

// announceService periodically announces the service
func (s *SSDPServer) announceService() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.sendAnnouncement()
		}
	}
}

// sendAnnouncement sends SSDP alive notifications
func (s *SSDPServer) sendAnnouncement() {
	hostname, _ := getHostname()
	localIP, err := getLocalIP()
	if err != nil {
		slog.Warn("Failed to get local IP for SSDP announcement", "err", err)
		return
	}

	// Create NOTIFY message
	var buf bytes.Buffer
	buf.WriteString("NOTIFY * HTTP/1.1\r\n")
	buf.WriteString("HOST: 239.255.255.250:1900\r\n")
	buf.WriteString("CACHE-CONTROL: max-age=1800\r\n")
	buf.WriteString("LOCATION: http://" + localIP + ":" + strconv.Itoa(s.backendPort) + "/description.xml\r\n")
	buf.WriteString("NT: " + SSDPSearchTarget + "\r\n")
	buf.WriteString("NTS: ssdp:alive\r\n")
	buf.WriteString("SERVER: System-Bridge/1.0 UPnP/1.0\r\n")
	buf.WriteString("USN: uuid:system-bridge-" + hostname + "::" + SSDPSearchTarget + "\r\n")
	buf.WriteString("\r\n")

	addr, _ := net.ResolveUDPAddr("udp", SSDPMulticastAddr)
	if _, err := s.multicastConn.WriteToUDP(buf.Bytes(), addr); err != nil {
		slog.Error("Failed to send SSDP announcement", "err", err)
	}
}

// handleDescription handles requests for service description
func (s *SSDPServer) handleDescription(w http.ResponseWriter, r *http.Request) {
	hostname, _ := getHostname()
	localIP, _ := getLocalIP()

	description := `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns="urn:schemas-upnp-org:device-1-0">
	<specVersion>
		<major>1</major>
		<minor>0</minor>
	</specVersion>
	<device>
		<deviceType>urn:schemas-system-bridge:device:bridge:1</deviceType>
		<friendlyName>System Bridge (` + hostname + `)</friendlyName>
		<manufacturer>System Bridge</manufacturer>
		<manufacturerURL>https://github.com/timmo001/system-bridge</manufacturerURL>
		<modelDescription>System monitoring and control bridge</modelDescription>
		<modelName>System Bridge</modelName>
		<modelNumber>1.0</modelNumber>
		<modelURL>https://github.com/timmo001/system-bridge</modelURL>
		<serialNumber>` + hostname + `</serialNumber>
		<UDN>uuid:system-bridge-` + hostname + `</UDN>
		<serviceList>
			<service>
				<serviceType>` + SSDPSearchTarget + `</serviceType>
				<serviceId>urn:system-bridge:serviceId:api</serviceId>
				<controlURL>/api</controlURL>
				<eventSubURL>/api/websocket</eventSubURL>
				<SCPDURL>/description.xml</SCPDURL>
			</service>
		</serviceList>
		<presentationURL>http://` + localIP + `:` + strconv.Itoa(s.backendPort) + `</presentationURL>
	</device>
</root>`

	w.Header().Set("Content-Type", "text/xml; charset=utf-8")
	w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", SSDPMaxAge))
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(description)); err != nil {
		slog.Error("Failed to write SSDP description response", "error", err)
	}
}

// handleRoot handles root requests
func (s *SSDPServer) handleRoot(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte("System Bridge SSDP Service")); err != nil {
		slog.Error("Failed to write SSDP root response", "error", err)
	}
}

// parseHeaders parses HTTP headers from a message
func parseHeaders(message string) map[string]string {
	headers := make(map[string]string)
	lines := strings.Split(message, "\r\n")

	for _, line := range lines[1:] {
		if strings.Contains(line, ":") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				headers[strings.ToUpper(key)] = value
			}
		}
	}

	return headers
}

// getHostname gets the system hostname
func getHostname() (string, error) {
	hostname, err := net.LookupCNAME("localhost")
	if err != nil {
		return "systembridge", err
	}
	return strings.TrimSuffix(hostname, "."), nil
}

// getLocalIP gets the local IP address
func getLocalIP() (string, error) {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "127.0.0.1", err
	}
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Error("Failed to close connection", "error", err)
		}
	}()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String(), nil
}
