package cpu

import (
	"encoding/csv"
	"strconv"
	"strings"
)

// parseTypeperfCSV reads typeperf's CSV output and returns the value of each
// expanded counter path from the last sample row. The first row is the
// header and the first column of every row is the timestamp.
func parseTypeperfCSV(out string) (map[string]float64, bool) {
	var header, last []string
	r := csv.NewReader(strings.NewReader(out))
	r.FieldsPerRecord = -1
	r.LazyQuotes = true
	for {
		rec, err := r.Read()
		if err != nil {
			break
		}
		if len(rec) < 2 {
			continue
		}
		if header == nil {
			header = rec
			continue
		}
		// Skip trailer text such as "Exiting, please wait..."
		if len(rec) == len(header) {
			last = rec
		}
	}
	if header == nil || last == nil {
		return nil, false
	}
	values := make(map[string]float64, len(header)-1)
	for i := 1; i < len(last); i++ {
		s := strings.Trim(last[i], "\" ")
		if s == "" {
			continue
		}
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			values[header[i]] = f
		}
	}
	if len(values) == 0 {
		return nil, false
	}
	return values, true
}

// typeperfInstance extracts the instance name from an expanded counter path
// such as `\\HOST\Processor(_Total)\% DPC Time`.
func typeperfInstance(path string) string {
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
