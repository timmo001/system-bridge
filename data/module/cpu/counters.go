package cpu

import "strings"

// expandCounterPath names one instance of a wildcard performance counter
// path, so `\Processor(*)\% DPC Time` with instance "0" becomes
// `\Processor(0)\% DPC Time`. Paths without a wildcard are returned as is.
func expandCounterPath(path, instance string) string {
	if instance == "" || !strings.Contains(path, "(*)") {
		return path
	}
	return strings.Replace(path, "(*)", "("+instance+")", 1)
}

// counterInstance extracts the instance name from a counter path such as
// `\Processor(_Total)\% DPC Time`.
func counterInstance(path string) string {
	counterSep := strings.LastIndex(path, `\`)
	if counterSep < 0 {
		return ""
	}
	object := path[:counterSep]
	open := strings.LastIndex(object, "(")
	if open < 0 || !strings.HasSuffix(object, ")") {
		return ""
	}
	return object[open+1 : len(object)-1]
}
