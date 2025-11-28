package fetch

import (
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

var (
	validModeValues           = []string{"navigate", "same-origin", "no-cors", "cors"}
	validCredentialsValues    = []string{"omit", "same-origin", "include"}
	validRedirectValues       = []string{"follow", "manual", "error"}
	validCacheValues          = []string{"default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"}
	validReferrerPolicyValues = []string{"", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"}
	validDuplexValues         = []string{"half"}
	forbiddenHTTPMethods      = map[string]struct{}{"CONNECT": {}, "TRACE": {}, "TRACK": {}}
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
	upper := strings.ToUpper(method)
	if _, forbidden := forbiddenHTTPMethods[upper]; forbidden {
		panic(runtime.NewTypeError(fmt.Sprintf("'%s' HTTP method is unsupported.", upper)))
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

func ensureValidCacheValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validCacheValues)
}

func ensureValidReferrerPolicyValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validReferrerPolicyValues)
}

func ensureValidDuplexValue(runtime *goja.Runtime, value string) {
	validateEnum(runtime, value, validDuplexValues)
}

func ensureOnlyIfCachedMode(runtime *goja.Runtime, cacheValue, modeValue string) {
	if strings.EqualFold(cacheValue, "only-if-cached") && !strings.EqualFold(modeValue, "same-origin") {
		panic(runtime.NewTypeError("'only-if-cached' can be set only with 'same-origin' mode"))
	}
}

func validateEnum(runtime *goja.Runtime, value string, allowed []string) {
	for _, candidate := range allowed {
		if value == candidate {
			return
		}
	}
	panic(runtime.NewTypeError(fmt.Sprintf("undefined: %s is not an accepted type. Expected one of %s.", value, strings.Join(allowed, ", "))))
}

func normalizeRequestOptions(runtime *goja.Runtime, options map[string]interface{}, modeFromRequest bool) map[string]interface{} {
	if options == nil {
		options = make(map[string]interface{})
	}

	methodStr := "GET"
	if rawMethod, ok := options["method"]; ok && rawMethod != nil {
		switch v := rawMethod.(type) {
		case string:
			methodStr = v
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

	currentMode := "cors"
	if modeVal, ok := options["mode"]; ok {
		modeStr := fmt.Sprintf("%v", modeVal)
		ensureValidModeValue(runtime, modeStr)
		if modeStr == "navigate" && !modeFromRequest {
			panic(runtime.NewTypeError("Request constructor: invalid request mode navigate."))
		}
		options["mode"] = modeStr
		currentMode = modeStr
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

	cacheValue := "default"
	if cacheVal, ok := options["cache"]; ok {
		cacheStr := fmt.Sprintf("%v", cacheVal)
		ensureValidCacheValue(runtime, cacheStr)
		options["cache"] = cacheStr
		cacheValue = cacheStr
	}
	ensureOnlyIfCachedMode(runtime, cacheValue, currentMode)

	return options
}
