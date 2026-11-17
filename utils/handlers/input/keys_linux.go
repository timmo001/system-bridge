package input

// waylandKeys are robotgo's key names, with their Linux input event codes
// (linux/input-event-codes.h), for the Wayland virtual keyboard's US keymap
var waylandKeys = map[string]uint32{
	"esc": 1, "escape": 1,

	"1": 2, "2": 3, "3": 4, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10, "0": 11,
	"-": 12, "=": 13, "backspace": 14,

	"tab": 15,
	"q":   16, "w": 17, "e": 18, "r": 19, "t": 20, "y": 21, "u": 22, "i": 23, "o": 24, "p": 25,
	"[": 26, "]": 27, "enter": 28, "return": 28,

	"a": 30, "s": 31, "d": 32, "f": 33, "g": 34, "h": 35, "j": 36, "k": 37, "l": 38,
	";": 39, "'": 40, "`": 41,

	"\\": 43,
	"z":  44, "x": 45, "c": 46, "v": 47, "b": 48, "n": 49, "m": 50,
	",": 51, ".": 52, "/": 53,

	"shift": 42, "shiftl": 42, "shiftr": 54, "right_shift": 54,
	"ctrl": 29, "control": 29, "ctrll": 29, "ctrlr": 97,
	"alt": 56, "altl": 56, "altr": 100,
	"cmd": 125, "command": 125, "cmdl": 125, "cmdr": 126,
	"space": 57, "caps": 58, "capslock": 58,

	"f1": 59, "f2": 60, "f3": 61, "f4": 62, "f5": 63, "f6": 64,
	"f7": 65, "f8": 66, "f9": 67, "f10": 68, "f11": 87, "f12": 88,
	"f13": 183, "f14": 184, "f15": 185, "f16": 186, "f17": 187, "f18": 188,
	"f19": 189, "f20": 190, "f21": 191, "f22": 192, "f23": 193, "f24": 194,

	"home": 102, "up": 103, "pageup": 104, "pgup": 104, "left": 105, "right": 106,
	"end": 107, "down": 108, "pagedown": 109, "pgdn": 109, "insert": 110, "delete": 111,

	"num_lock": 69, "numpad_lock": 69, "num_clear": 69,
	"num/": 98, "num*": 55, "num-": 74, "num+": 78, "num.": 83, "num_enter": 96, "num_equal": 117,
	"num0": 82, "num1": 79, "num2": 80, "num3": 81, "num4": 75,
	"num5": 76, "num6": 77, "num7": 71, "num8": 72, "num9": 73,
	"numpad_0": 82, "numpad_1": 79, "numpad_2": 80, "numpad_3": 81, "numpad_4": 75,
	"numpad_5": 76, "numpad_6": 77, "numpad_7": 71, "numpad_8": 72, "numpad_9": 73,

	"print": 99, "printscreen": 99, "scroll_lock": 70, "pause": 119, "pause_break": 119, "menu": 127,

	"audio_mute": 113, "audio_vol_down": 114, "audio_vol_up": 115,
	"audio_play": 164, "audio_pause": 201, "audio_stop": 166,
	"audio_prev": 165, "audio_next": 163, "audio_rewind": 168, "audio_forward": 208,
	"audio_repeat": 439, "audio_random": 410,

	"lights_mon_down": 224, "lights_mon_up": 225,
	"lights_kbd_toggle": 228, "lights_kbd_down": 229, "lights_kbd_up": 230,
}

// shiftedKeys are the characters typed with shift held, by their unshifted
// key on a US keyboard
var shiftedKeys = map[rune]string{
	'!': "1", '@': "2", '#': "3", '$': "4", '%': "5",
	'^': "6", '&': "7", '*': "8", '(': "9", ')': "0",
	'_': "-", '+': "=", '{': "[", '}': "]", '|': "\\",
	':': ";", '"': "'", '<': ",", '>': ".", '?': "/", '~': "`",
}

// whitespaceKeys are the keys for whitespace characters
var whitespaceKeys = map[rune]string{' ': "space", '\t': "tab", '\n': "enter"}
