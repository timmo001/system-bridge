package discord

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
)

type opcode uint32

const (
	opHandshake opcode = 0
	opFrame     opcode = 1
	opClose     opcode = 2
	opPing      opcode = 3
	opPong      opcode = 4
)

// Discord payloads are small JSON objects. The limit stops a corrupt length
// header from allocating a huge buffer.
const maxFrameSize = 16 << 20

// writeFrame writes one IPC frame: a little-endian opcode and length, then JSON.
func writeFrame(w io.Writer, op opcode, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode frame: %w", err)
	}
	buf := make([]byte, 8+len(body))
	binary.LittleEndian.PutUint32(buf[0:4], uint32(op))
	binary.LittleEndian.PutUint32(buf[4:8], uint32(len(body)))
	copy(buf[8:], body)
	if _, err := w.Write(buf); err != nil {
		return fmt.Errorf("failed to write frame: %w", err)
	}
	return nil
}

func readFrame(r io.Reader) (opcode, []byte, error) {
	var header [8]byte
	if _, err := io.ReadFull(r, header[:]); err != nil {
		return 0, nil, err
	}
	op := opcode(binary.LittleEndian.Uint32(header[0:4]))
	length := binary.LittleEndian.Uint32(header[4:8])
	if length > maxFrameSize {
		return 0, nil, fmt.Errorf("frame too large: %d bytes", length)
	}
	body := make([]byte, length)
	if _, err := io.ReadFull(r, body); err != nil {
		return 0, nil, err
	}
	return op, body, nil
}
