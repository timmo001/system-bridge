package system

import (
	"bufio"
	"bytes"
	"regexp"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// winget's output is parsed on every platform so its tests run anywhere

// ansiEscape matches the terminal control sequences winget draws its progress
// with
var ansiEscape = regexp.MustCompile(`\x1b\[[0-9;?]*[A-Za-z]`)

// wingetUpdates reads the rows of winget upgrade's first table, which come
// after its header and dashed separator line. Its columns are Name, Id,
// Version, Available and Source, in whatever language winget uses, so they're
// found by where each header word starts. A row has text where the last
// column starts, which the summary line after the table doesn't reach. found
// is false when there's no table.
func wingetUpdates(out []byte) (updates []types.SystemPackageUpdate, found bool) {
	var header []rune
	var columns []int
	updates = []types.SystemPackageUpdate{}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := ansiEscape.ReplaceAllString(strings.TrimSuffix(scanner.Text(), "\r"), "")
		// Progress spinners are redrawn on the same line with carriage returns
		if i := strings.LastIndexByte(line, '\r'); i >= 0 {
			line = line[i+1:]
		}
		runes := []rune(strings.TrimRight(line, " "))

		if columns == nil {
			if len(runes) > 0 && strings.Trim(string(runes), "-") == "" {
				columns = []int{0}
				for i := 1; i < len(header); i++ {
					if header[i-1] == ' ' && header[i] != ' ' {
						columns = append(columns, i)
					}
				}
				if len(columns) < 2 {
					return nil, false
				}
				continue
			}
			header = runes
			continue
		}

		last := columns[len(columns)-1]
		if len(runes) <= last || runes[last-1] != ' ' || runes[last] == ' ' {
			return updates, true
		}
		updates = append(updates, wingetRow(runes, columns))
	}
	return updates, columns != nil
}

// wingetRow reads one row's name, installed version and available version
func wingetRow(runes []rune, columns []int) types.SystemPackageUpdate {
	cell := func(index int) string {
		if index >= len(columns) || columns[index] >= len(runes) {
			return ""
		}
		end := len(runes)
		if index+1 < len(columns) && columns[index+1] < end {
			end = columns[index+1]
		}
		return strings.TrimSpace(string(runes[columns[index]:end]))
	}

	update := types.SystemPackageUpdate{Name: cell(0), Version: cell(3)}
	if current := cell(2); current != "" {
		update.CurrentVersion = &current
	}
	return update
}
