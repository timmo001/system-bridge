//go:build windows

package utils

import "github.com/yusufpapurcu/wmi"

// wmiClient leaves pointer fields nil for NULL properties, so a value the
// class does not report can be told apart from zero.
var wmiClient = &wmi.Client{PtrNil: true, AllowMissingFields: true}

// QueryWMI runs a WQL query in process and stores the results in dst, which
// must be a pointer to a slice of structs whose field names match the
// selected properties. An empty namespace uses the default, root\cimv2.
// Querying WMI directly avoids starting PowerShell for every reading.
func QueryWMI(namespace, query string, dst any) error {
	if namespace == "" {
		return wmiClient.Query(query, dst)
	}
	return wmiClient.Query(query, dst, nil, namespace)
}
