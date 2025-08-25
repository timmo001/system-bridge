package http

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"log/slog"
)

// CacheEntry represents a cached HTTP response
type CacheEntry struct {
	Data       []byte
	ExpiresAt  time.Time
	LastAccess time.Time
}

// RateLimiter handles rate limiting for specific endpoints
type RateLimiter struct {
	RequestCount int
	ResetAt      time.Time
	MaxRequests  int           // Maximum requests allowed in the time window
	TimeWindow   time.Duration // Time window for rate limiting
}

// Client handles HTTP requests with caching and rate limiting
type Client struct {
	cache      map[string]*CacheEntry
	rateLimits map[string]*RateLimiter
	cacheMutex sync.RWMutex
	client     *http.Client
	defaultTTL time.Duration
}

// ClientConfig holds configuration for the HTTP client
type ClientConfig struct {
	DefaultTTL            time.Duration
	MaxRequests           int
	TimeWindow            time.Duration
	RequestTimeout        time.Duration
	DialTimeout           time.Duration
	TLSHandshakeTimeout   time.Duration
	ResponseHeaderTimeout time.Duration
	IdleConnTimeout       time.Duration
}

// NewClient creates a new HTTP client with caching and rate limiting
func NewClient(config *ClientConfig) *Client {
	if config == nil {
		config = &ClientConfig{
			DefaultTTL:            5 * time.Minute, // Default cache TTL
			MaxRequests:           30,              // Conservative default for unauthenticated requests
			TimeWindow:            time.Hour,       // Default time window
			RequestTimeout:        2 * time.Second,
			DialTimeout:           1 * time.Second,
			TLSHandshakeTimeout:   1 * time.Second,
			ResponseHeaderTimeout: 2 * time.Second,
			IdleConnTimeout:       30 * time.Second,
		}
	}

	// Apply sane defaults if fields are zero
	if config.RequestTimeout == 0 {
		config.RequestTimeout = 2 * time.Second
	}
	if config.DialTimeout == 0 {
		config.DialTimeout = 1 * time.Second
	}
	if config.TLSHandshakeTimeout == 0 {
		config.TLSHandshakeTimeout = 1 * time.Second
	}
	if config.ResponseHeaderTimeout == 0 {
		config.ResponseHeaderTimeout = 2 * time.Second
	}
	if config.IdleConnTimeout == 0 {
		config.IdleConnTimeout = 30 * time.Second
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   config.DialTimeout,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       config.IdleConnTimeout,
		TLSHandshakeTimeout:   config.TLSHandshakeTimeout,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: config.ResponseHeaderTimeout,
	}

	return &Client{
		cache:      make(map[string]*CacheEntry),
		rateLimits: make(map[string]*RateLimiter),
		client:     &http.Client{Timeout: config.RequestTimeout, Transport: transport},
		defaultTTL: config.DefaultTTL,
	}
}

// Get performs a GET request with caching and rate limiting
func (c *Client) Get(url string) ([]byte, error) {
	// Check cache first
	if data := c.getFromCache(url); data != nil {
		return data, nil
	}

	// Check rate limit
	if err := c.checkRateLimit(url); err != nil {
		// If rate limited and we have cached data, return it even if expired
		if data := c.getExpiredFromCache(url); data != nil {
			return data, nil
		}
		return nil, err
	}

	// Perform request
	resp, err := c.client.Get(url)
	if err != nil {
		// On error, try to return cached data even if expired
		if data := c.getExpiredFromCache(url); data != nil {
			return data, nil
		}
		return nil, fmt.Errorf("failed to fetch URL %s: %v", url, err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			slog.Error("Error closing response body", "error", err)
		}
	}()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		// On error, try to return cached data even if expired
		if data := c.getExpiredFromCache(url); data != nil {
			return data, nil
		}
		return nil, fmt.Errorf("failed to read response body from %s: %v", url, err)
	}

	// Update cache
	c.updateCache(url, body)

	return body, nil
}

// getFromCache retrieves valid cached data
func (c *Client) getFromCache(url string) []byte {
	c.cacheMutex.RLock()
	defer c.cacheMutex.RUnlock()

	if entry, exists := c.cache[url]; exists {
		if time.Now().Before(entry.ExpiresAt) {
			entry.LastAccess = time.Now()
			return entry.Data
		}
	}
	return nil
}

// getExpiredFromCache retrieves cached data even if expired
func (c *Client) getExpiredFromCache(url string) []byte {
	c.cacheMutex.RLock()
	defer c.cacheMutex.RUnlock()

	if entry, exists := c.cache[url]; exists {
		entry.LastAccess = time.Now()
		return entry.Data
	}
	return nil
}

// updateCache stores response data in cache
func (c *Client) updateCache(url string, data []byte) {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	c.cache[url] = &CacheEntry{
		Data:       data,
		ExpiresAt:  time.Now().Add(c.defaultTTL),
		LastAccess: time.Now(),
	}
}

// checkRateLimit verifies if the request is allowed under rate limiting
func (c *Client) checkRateLimit(url string) error {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	limiter, exists := c.rateLimits[url]
	if !exists {
		limiter = &RateLimiter{
			RequestCount: 0,
			ResetAt:      time.Now().Add(time.Hour),
			MaxRequests:  30, // Conservative default for unauthenticated requests
			TimeWindow:   time.Hour,
		}
		c.rateLimits[url] = limiter
	}

	// Reset counter if time window has passed
	if time.Now().After(limiter.ResetAt) {
		limiter.RequestCount = 0
		limiter.ResetAt = time.Now().Add(limiter.TimeWindow)
	}

	// Check if we're over the limit
	if limiter.RequestCount >= limiter.MaxRequests {
		return fmt.Errorf("rate limit exceeded for %s, resets at %s", url, limiter.ResetAt)
	}

	// Increment counter
	limiter.RequestCount++
	return nil
}

// ClearCache removes all entries from the cache
func (c *Client) ClearCache() {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()
	c.cache = make(map[string]*CacheEntry)
}

// SetRateLimit sets custom rate limit for a specific URL
func (c *Client) SetRateLimit(url string, maxRequests int, timeWindow time.Duration) {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	c.rateLimits[url] = &RateLimiter{
		RequestCount: 0,
		ResetAt:      time.Now().Add(timeWindow),
		MaxRequests:  maxRequests,
		TimeWindow:   timeWindow,
	}
}
