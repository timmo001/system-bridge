package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/timmo001/system-bridge/types"
)

// Services gets the services module's latest data. Before the backend's
// first read it has empty lists.
func Services(ctx context.Context) (types.ServicesData, error) {
	data := types.ServicesData{
		Providers: []types.ServiceProvider{},
		Items:     []types.ServiceItem{},
		Busy:      []types.ServiceBusy{},
		Errors:    []types.ServiceError{},
	}

	backend, err := BackendFor(ctx)
	if err != nil {
		return data, err
	}
	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, backend.HTTP("/api/data/"+string(types.ModuleServices)), nil)
	if err != nil {
		return data, fmt.Errorf("create services request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+backend.Key)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return data, backend.Unreachable(err)
	}
	defer func() { _ = response.Body.Close() }()
	switch response.StatusCode {
	case http.StatusOK:
	case http.StatusUnauthorized:
		return data, backend.Rejected(ErrBadKey)
	case http.StatusNotFound:
		return data, fmt.Errorf("this System Bridge has no services module: update it")
	default:
		return data, fmt.Errorf("get services: %s", response.Status)
	}

	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		return data, fmt.Errorf("decode services: %w", err)
	}
	return data, nil
}
