package fetch

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

var (
	validModeValues        = []string{"navigate", "same-origin", "no-cors", "cors"}
	validCredentialsValues = []string{"omit", "same-origin", "include"}
	validRedirectValues    = []string{"follow", "manual", "error"}
)

func ensureValidHeaderName(runtime *goja.Runtime, ctx, name string) {
	if name == "" || !isHTTPToken(name) {
		panic(runtime.NewTypeError(fmt.Sprintf("%s: %q is an invalid header name.", ctx, name)))
	}
}

func ensureValidHeaderValue(runtime *goja.Runtime, ctx, value string) {
	for i := 0; i < len(value); i++ {
		switch value[i] {
		case '\r', '\n', 0:
			panic(runtime.NewTypeError(fmt.Sprintf("%s: %q is an invalid header value.", ctx, value)))
		}
	}
}

func normalizeHeaderValue(value string) string {
	return strings.TrimFunc(value, func(r rune) bool {
		switch r {
		case ' ', '\t', '\r', '\n':
			return true
		default:
			return false
		}
	})
}

func isHTTPToken(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c <= 0x20 || c >= 0x7f {
			return false
		}
		switch c {
		case '(', ')', '<', '>', '@', ',', ';', ':', '\\', '"', '/', '[', ']', '?', '=', '{', '}', ' ', '\t':
			return false
		}
	}
	return true
}

func validateHTTPMethod(runtime *goja.Runtime, method string) {
	if method == "" || !isHTTPToken(method) {
		panic(runtime.NewTypeError(fmt.Sprintf("'%s' is not a valid HTTP method.", method)))
	}
}

func hasUsableBodyValue(val interface{}) bool {
	if val == nil {
		return false
	}
	if jsVal, ok := val.(goja.Value); ok {
		return !(goja.IsUndefined(jsVal) || goja.IsNull(jsVal))
	}
	return true
}

func hasBodyInOptions(options map[string]interface{}) bool {
	if options == nil {
		return false
	}
	if body, ok := options["body"]; ok && hasUsableBodyValue(body) {
		return true
	}
	if raw, ok := options["__rawBodyObject"]; ok && hasUsableBodyValue(raw) {
		return true
	}
	if formData, ok := options["__formDataBody"]; ok && formData != nil {
		return true
	}
	return false
}

func ensureValidModeValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validModeValues)
}

func ensureValidCredentialsValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validCredentialsValues)
}

func ensureValidRedirectValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validRedirectValues)
}

func validateEnum(runtime *goja.Runtime, value string, allowed []string) {
	for _, candidate := range allowed {
		if value == candidate {
			return
		}
	}
	panic(runtime.NewTypeError(fmt.Sprintf("undefined: %s is not an accepted type. Expected one of %s.", value, strings.Join(allowed, ", "))))
}

func normalizeRequestOptions(runtime *goja.Runtime, options map[string]interface{}) map[string]interface{} {
	if options == nil {
		options = make(map[string]interface{})
	}

	methodStr := "GET"
	if rawMethod, ok := options["method"]; ok && rawMethod != nil {
		switch v := rawMethod.(type) {
		case string:
			if v != "" {
				methodStr = v
			}
		case goja.Value:
			if !goja.IsUndefined(v) && !goja.IsNull(v) {
				methodStr = v.String()
			}
		default:
			methodStr = fmt.Sprintf("%v", rawMethod)
		}
	}

	validateHTTPMethod(runtime, methodStr)
	normalizedMethod := strings.ToUpper(methodStr)
	options["method"] = normalizedMethod

	if (normalizedMethod == "GET" || normalizedMethod == "HEAD") && hasBodyInOptions(options) {
		panic(runtime.NewTypeError("Request with GET/HEAD method cannot have body."))
	}

	if modeVal, ok := options["mode"]; ok {
		modeStr := fmt.Sprintf("%v", modeVal)
		ensureValidModeValue(runtime, modeStr)
		options["mode"] = modeStr
	}
	if credentialsVal, ok := options["credentials"]; ok {
		credentialsStr := fmt.Sprintf("%v", credentialsVal)
		ensureValidCredentialsValue(runtime, credentialsStr)
		options["credentials"] = credentialsStr
	}
	if redirectVal, ok := options["redirect"]; ok {
		redirectStr := fmt.Sprintf("%v", redirectVal)
		ensureValidRedirectValue(runtime, redirectStr)
		options["redirect"] = redirectStr
	}

	return options
}
