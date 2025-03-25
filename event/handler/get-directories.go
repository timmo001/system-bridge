package event_handler

import (
	"os"
	"runtime"
	"syscall"
	"unsafe"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"golang.org/x/sys/windows"
)

type GetDirectoriesResponseDataItem struct {
	Key  string `json:"key"`
	Path string `json:"path"`
}

type GetDirectoriesResponseData = []GetDirectoriesResponseDataItem

// Windows KNOWNFOLDERID GUIDs
var (
	FOLDERID_Desktop   = windows.GUID{Data1: 0xB4BFCC3A, Data2: 0xDB2C, Data3: 0x424C, Data4: [8]byte{0xB0, 0x29, 0x7F, 0xE9, 0x9A, 0x87, 0xC6, 0x41}}
	FOLDERID_Documents = windows.GUID{Data1: 0xFDD39AD0, Data2: 0x238F, Data3: 0x46AF, Data4: [8]byte{0xAD, 0xB4, 0x6C, 0x85, 0x48, 0x03, 0x69, 0xC7}}
	FOLDERID_Downloads = windows.GUID{Data1: 0x374DE290, Data2: 0x123F, Data3: 0x4565, Data4: [8]byte{0x91, 0x64, 0x39, 0xC4, 0x92, 0x5E, 0x46, 0x7B}}
	FOLDERID_Music     = windows.GUID{Data1: 0x4BD8D571, Data2: 0x6D19, Data3: 0x48D3, Data4: [8]byte{0xBE, 0x97, 0x42, 0x22, 0x20, 0x08, 0x0E, 0x43}}
	FOLDERID_Pictures  = windows.GUID{Data1: 0x33E28130, Data2: 0x4E1E, Data3: 0x4676, Data4: [8]byte{0x83, 0x5A, 0x98, 0x39, 0x5C, 0x3B, 0xC3, 0xBB}}
	FOLDERID_Videos    = windows.GUID{Data1: 0x18989B1D, Data2: 0x99B5, Data3: 0x455B, Data4: [8]byte{0x84, 0x1C, 0xAB, 0x7C, 0x74, 0xE4, 0xDD, 0xFC}}
)

var (
	shell32                  = syscall.NewLazyDLL("shell32.dll")
	procSHGetKnownFolderPath = shell32.NewProc("SHGetKnownFolderPath")
	ole32                    = syscall.NewLazyDLL("ole32.dll")
	procCoTaskMemFree        = ole32.NewProc("CoTaskMemFree")
)

// getKnownFolderPath retrieves the path of a known folder identified by its KNOWNFOLDERID
func getKnownFolderPath(folderID *windows.GUID) string {
	var path *uint16
	flags := uint32(0)        // KF_FLAG_DEFAULT
	token := windows.Token(0) // Current user

	r, _, _ := procSHGetKnownFolderPath.Call(
		uintptr(unsafe.Pointer(folderID)),
		uintptr(flags),
		uintptr(token),
		uintptr(unsafe.Pointer(&path)))

	if r != 0 {
		log.Errorf("Error getting known folder path: %v", r)
		return ""
	}

	defer procCoTaskMemFree.Call(uintptr(unsafe.Pointer(path)))
	return windows.UTF16PtrToString(path)
}

func GetDirectories(router *event.MessageRouter) GetDirectoriesResponseData {
	var desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory string

	if runtime.GOOS == "windows" {
		// Windows paths using Shell32 API
		desktopDirectory = getKnownFolderPath(&FOLDERID_Desktop)
		documentsDirectory = getKnownFolderPath(&FOLDERID_Documents)
		downloadsDirectory = getKnownFolderPath(&FOLDERID_Downloads)
		musicDirectory = getKnownFolderPath(&FOLDERID_Music)
		picturesDirectory = getKnownFolderPath(&FOLDERID_Pictures)
		videosDirectory = getKnownFolderPath(&FOLDERID_Videos)

		// Fallback to USERPROFILE if Shell32 API fails
		if userProfile := os.Getenv("USERPROFILE"); userProfile != "" {
			if desktopDirectory == "" {
				log.Warnf("Failed to get desktop directory using Shell32 API, falling back to USERPROFILE")
				desktopDirectory = userProfile + "\\Desktop"
			}
			if documentsDirectory == "" {
				log.Warnf("Failed to get documents directory using Shell32 API, falling back to USERPROFILE")
				documentsDirectory = userProfile + "\\Documents"
			}
			if downloadsDirectory == "" {
				log.Warnf("Failed to get downloads directory using Shell32 API, falling back to USERPROFILE")
				downloadsDirectory = userProfile + "\\Downloads"
			}
			if musicDirectory == "" {
				log.Warnf("Failed to get music directory using Shell32 API, falling back to USERPROFILE")
				musicDirectory = userProfile + "\\Music"
			}
			if picturesDirectory == "" {
				log.Warnf("Failed to get pictures directory using Shell32 API, falling back to USERPROFILE")
				picturesDirectory = userProfile + "\\Pictures"
			}
			if videosDirectory == "" {
				log.Warnf("Failed to get videos directory using Shell32 API, falling back to USERPROFILE")
				videosDirectory = userProfile + "\\Videos"
			}
		}
	} else {
		// Unix/Linux paths
		if os.Getenv("XDG_DESKTOP_DIR") != "" {
			desktopDirectory = os.Getenv("XDG_DESKTOP_DIR")
		} else if os.Getenv("HOME") != "" {
			desktopDirectory = os.Getenv("HOME") + "/Desktop"
		}

		if os.Getenv("XDG_DOCUMENTS_DIR") != "" {
			documentsDirectory = os.Getenv("XDG_DOCUMENTS_DIR")
		} else if os.Getenv("HOME") != "" {
			documentsDirectory = os.Getenv("HOME") + "/Documents"
		}

		if os.Getenv("XDG_DOWNLOAD_DIR") != "" {
			downloadsDirectory = os.Getenv("XDG_DOWNLOAD_DIR")
		} else if os.Getenv("HOME") != "" {
			downloadsDirectory = os.Getenv("HOME") + "/Downloads"
		}

		if os.Getenv("XDG_MUSIC_DIR") != "" {
			musicDirectory = os.Getenv("XDG_MUSIC_DIR")
		} else if os.Getenv("HOME") != "" {
			musicDirectory = os.Getenv("HOME") + "/Music"
		}

		if os.Getenv("XDG_PICTURES_DIR") != "" {
			picturesDirectory = os.Getenv("XDG_PICTURES_DIR")
		} else if os.Getenv("HOME") != "" {
			picturesDirectory = os.Getenv("HOME") + "/Pictures"
		}

		if os.Getenv("XDG_VIDEOS_DIR") != "" {
			videosDirectory = os.Getenv("XDG_VIDEOS_DIR")
		} else if os.Getenv("HOME") != "" {
			videosDirectory = os.Getenv("HOME") + "/Videos"
		}
	}

	directories := GetDirectoriesResponseData{
		{
			Key:  "desktop",
			Path: desktopDirectory,
		},
		{
			Key:  "documents",
			Path: documentsDirectory,
		},
		{
			Key:  "downloads",
			Path: downloadsDirectory,
		},
		{
			Key:  "music",
			Path: musicDirectory,
		},
		{
			Key:  "pictures",
			Path: picturesDirectory,
		},
		{
			Key:  "videos",
			Path: videosDirectory,
		},
	}

	// Get user media directories
	for _, directory := range router.Settings.Media.Directories {
		directories = append(directories, GetDirectoriesResponseDataItem{
			Key:  directory.Name,
			Path: directory.Path,
		})
	}

	return directories
}

func RegisterGetDirectoriesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDirectories, func(message event.Message) event.MessageResponse {
		log.Infof("Received get directories event: %v", message)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDirectories,
			Subtype: event.ResponseSubtypeNone,
			Data:    GetDirectories(router),
			Message: "Got directories",
		}
	})
}
