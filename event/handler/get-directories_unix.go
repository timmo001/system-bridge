package event_handler

import "os"

func GetUnixDirectories() (string, string, string, string, string, string) {
	var desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory string

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

	return desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory
}
