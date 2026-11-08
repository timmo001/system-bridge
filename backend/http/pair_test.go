package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func makePairCode(t *testing.T, codes *PairCodes, token string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/pair/code", nil)
	request.Host = "192.0.2.10:9170"
	request.Header.Set("X-API-Token", token)
	response := httptest.NewRecorder()
	PairCodeHandler("secret", codes)(response, request)
	return response
}

func pairWith(codes *PairCodes, code string) *httptest.ResponseRecorder {
	body := `{"code":"` + code + `","client":{"id":"phone","name":"Pixel","platform":"android"}}`
	request := httptest.NewRequest(http.MethodPost, "/api/pair", strings.NewReader(body))
	response := httptest.NewRecorder()
	PairHandler("secret", codes, PairedService{ID: "uuid", Name: "desk"})(response, request)
	return response
}

func TestPairing(t *testing.T) {
	codes := NewPairCodes()

	created := makePairCode(t, codes, "secret")
	if created.Code != http.StatusOK {
		t.Fatalf("making a code: got %d", created.Code)
	}
	var made struct{ Code, Link string }
	if err := json.NewDecoder(created.Body).Decode(&made); err != nil {
		t.Fatal(err)
	}
	if made.Link != "http://192.0.2.10:9170/?pair="+made.Code {
		t.Errorf("link: got %q", made.Link)
	}

	first := pairWith(codes, made.Code)
	if first.Code != http.StatusOK {
		t.Fatalf("pairing: got %d", first.Code)
	}
	var paired struct {
		Token   string
		Service PairedService
	}
	if err := json.NewDecoder(first.Body).Decode(&paired); err != nil {
		t.Fatal(err)
	}
	if paired.Token != "secret" || paired.Service.ID != "uuid" {
		t.Errorf("pairing answered %+v", paired)
	}

	if again := pairWith(codes, made.Code); again.Code != http.StatusUnauthorized {
		t.Errorf("a code works once: got %d the second time", again.Code)
	}
}

func TestPairingRefused(t *testing.T) {
	t.Run("making a code without the token", func(t *testing.T) {
		if response := makePairCode(t, NewPairCodes(), "wrong"); response.Code != http.StatusUnauthorized {
			t.Errorf("got %d", response.Code)
		}
	})

	t.Run("a wrong code", func(t *testing.T) {
		codes := NewPairCodes()
		makePairCode(t, codes, "secret")
		if response := pairWith(codes, "NOTACODE"); response.Code != http.StatusUnauthorized {
			t.Errorf("got %d", response.Code)
		}
	})

	t.Run("an expired code", func(t *testing.T) {
		codes := NewPairCodes()
		code, _, err := codes.create()
		if err != nil {
			t.Fatal(err)
		}
		codes.now = func() time.Time { return time.Now().Add(pairCodeLifetime + time.Second) }
		if response := pairWith(codes, code); response.Code != http.StatusUnauthorized {
			t.Errorf("got %d", response.Code)
		}
	})
}
