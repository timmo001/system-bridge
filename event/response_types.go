package event

type ResponseType string

const (
	ResponseTypeError   ResponseType = "error"
	ResponseTypeSuccess ResponseType = "success"
	ResponseTypePong    ResponseType = "pong"
)

type ResponseSubtype string

const (
	ResponseSubtypeUnknown ResponseSubtype = "unknown"
)
