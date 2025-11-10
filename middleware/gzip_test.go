package middleware

import (
	"compress/gzip"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func init() {
	// 设置测试模式
	gin.SetMode(gin.TestMode)
}

// TestGzipMiddleware_BasicCompression 测试基本压缩功能
func TestGzipMiddleware_BasicCompression(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	router.GET("/test", func(c *gin.Context) {
		c.JSON(200, map[string]string{"message": "hello world"})
	})

	// 创建请求，带 Accept-Encoding: gzip
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证响应头
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))
	assert.Equal(t, "Accept-Encoding", w.Header().Get("Vary"))

	// 验证响应可以解压
	reader, err := gzip.NewReader(w.Body)
	assert.NoError(t, err)
	defer reader.Close()

	body, err := io.ReadAll(reader)
	assert.NoError(t, err)
	assert.Contains(t, string(body), "hello world")
}

// TestGzipMiddleware_NoCompression 测试客户端不支持 gzip
func TestGzipMiddleware_NoCompression(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	router.GET("/test", func(c *gin.Context) {
		c.String(200, "hello world")
	})

	// 创建请求，不带 Accept-Encoding: gzip
	req := httptest.NewRequest("GET", "/test", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证没有压缩
	assert.Empty(t, w.Header().Get("Content-Encoding"))
	assert.Equal(t, "hello world", w.Body.String())
}

// TestGzipMiddleware_SkipImages 测试跳过图片压缩
func TestGzipMiddleware_SkipImages(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	router.GET("/test.jpg", func(c *gin.Context) {
		c.String(200, "fake image data")
	})

	req := httptest.NewRequest("GET", "/test.jpg", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证没有压缩（已压缩的图片应该跳过）
	assert.Empty(t, w.Header().Get("Content-Encoding"))
	assert.Equal(t, "fake image data", w.Body.String())
}

// TestGzipMiddleware_SkipCompressedFiles 测试跳过已压缩文件
func TestGzipMiddleware_SkipCompressedFiles(t *testing.T) {
	testCases := []string{
		"/test.zip",
		"/test.gz",
		"/test.tar.gz",
		"/test.7z",
		"/test.rar",
	}

	for _, path := range testCases {
		t.Run(path, func(t *testing.T) {
			router := gin.New()
			router.Use(GzipMiddleware())

			router.GET(path, func(c *gin.Context) {
				c.String(200, "compressed file data")
			})

			req := httptest.NewRequest("GET", path, nil)
			req.Header.Set("Accept-Encoding", "gzip")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// 验证没有压缩
			assert.Empty(t, w.Header().Get("Content-Encoding"))
			assert.Equal(t, "compressed file data", w.Body.String())
		})
	}
}

// TestGzipMiddleware_EmptyResponse 测试空响应
func TestGzipMiddleware_EmptyResponse(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	router.GET("/test", func(c *gin.Context) {
		c.Status(204) // No Content
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 204, w.Code)
}

// TestGzipMiddleware_LargeResponse 测试大响应（> 4KB，触发刷新）
func TestGzipMiddleware_LargeResponse(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	// 生成 10KB 数据
	largeData := strings.Repeat("A", 10*1024)

	router.GET("/test", func(c *gin.Context) {
		c.String(200, largeData)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证压缩
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))

	// 验证压缩率（应该有明显压缩，因为是重复字符）
	compressedSize := w.Body.Len()
	assert.Less(t, compressedSize, len(largeData)/10, "压缩率应该 > 90%")

	// 验证解压后正确
	reader, err := gzip.NewReader(w.Body)
	assert.NoError(t, err)
	defer reader.Close()

	body, err := io.ReadAll(reader)
	assert.NoError(t, err)
	assert.Equal(t, largeData, string(body))
}

// TestGzipMiddleware_StreamingMode 测试流式模式检测
func TestGzipMiddleware_StreamingMode(t *testing.T) {
	testCases := []struct {
		name     string
		path     string
		headers  map[string]string
		expected bool // 是否应该是流式模式
	}{
		{
			name:     "SSE request",
			path:     "/events",
			headers:  map[string]string{"Accept": "text/event-stream"},
			expected: true,
		},
		{
			name:     "WebSocket request",
			path:     "/ws",
			headers:  map[string]string{"Upgrade": "websocket"},
			expected: true,
		},
		{
			name:     "Normal request",
			path:     "/api/data",
			headers:  map[string]string{},
			expected: false,
		},
		{
			name:     "Stream path",
			path:     "/stream/data",
			headers:  map[string]string{},
			expected: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()

			var detectedStreamMode bool
			router.Use(func(c *gin.Context) {
				c.Next()
			})
			router.Use(GzipMiddleware())

			router.GET(tc.path, func(c *gin.Context) {
				// 检查 writer 是否是 gzipWriter
				if gw, ok := c.Writer.(*gzipWriter); ok {
					detectedStreamMode = gw.streamMode
				}
				c.String(200, "ok")
			})

			req := httptest.NewRequest("GET", tc.path, nil)
			req.Header.Set("Accept-Encoding", "gzip")
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expected, detectedStreamMode,
				"流式模式检测不符合预期")
		})
	}
}

// TestGzipMiddleware_MultipleWrites 测试多次写入（条件刷新）
func TestGzipMiddleware_MultipleWrites(t *testing.T) {
	router := gin.New()
	router.Use(GzipMiddleware())

	router.GET("/test", func(c *gin.Context) {
		// 多次小写入（每次 < 4KB）
		for i := 0; i < 10; i++ {
			c.Writer.WriteString("chunk ")
		}
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// 验证压缩
	assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))

	// 验证解压后正确
	reader, err := gzip.NewReader(w.Body)
	assert.NoError(t, err)
	defer reader.Close()

	body, err := io.ReadAll(reader)
	assert.NoError(t, err)
	assert.Equal(t, "chunk chunk chunk chunk chunk chunk chunk chunk chunk chunk ", string(body))
}

// TestGzipMiddlewareWithLevel_CustomLevel 测试自定义压缩级别
func TestGzipMiddlewareWithLevel_CustomLevel(t *testing.T) {
	testCases := []struct {
		name  string
		level int
	}{
		{"BestSpeed", gzip.BestSpeed},
		{"DefaultCompression", gzip.DefaultCompression},
		{"BestCompression", gzip.BestCompression},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			router.Use(GzipMiddlewareWithLevel(tc.level))

			// 使用重复数据测试压缩率
			testData := strings.Repeat("test data ", 1000)

			router.GET("/test", func(c *gin.Context) {
				c.String(200, testData)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("Accept-Encoding", "gzip")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// 验证压缩
			assert.Equal(t, "gzip", w.Header().Get("Content-Encoding"))

			// 验证解压后正确
			reader, err := gzip.NewReader(w.Body)
			assert.NoError(t, err)
			defer reader.Close()

			body, err := io.ReadAll(reader)
			assert.NoError(t, err)
			assert.Equal(t, testData, string(body))
		})
	}
}

// BenchmarkGzipMiddleware 基准测试
func BenchmarkGzipMiddleware(b *testing.B) {
	router := gin.New()
	router.Use(GzipMiddleware())

	testData := strings.Repeat("benchmark test data ", 100)

	router.GET("/test", func(c *gin.Context) {
		c.String(200, testData)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

// BenchmarkGzipMiddleware_NoCompression 无压缩基准测试
func BenchmarkGzipMiddleware_NoCompression(b *testing.B) {
	router := gin.New()

	testData := strings.Repeat("benchmark test data ", 100)

	router.GET("/test", func(c *gin.Context) {
		c.String(200, testData)
	})

	req := httptest.NewRequest("GET", "/test", nil)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

// TestGzipWriter_Flush 测试 Flush 方法
func TestGzipWriter_Flush(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	gz, _ := gzip.NewWriterLevel(c.Writer, gzip.BestSpeed)
	gw := &gzipWriter{
		ResponseWriter: c.Writer,
		writer:         gz,
		buffered:       0,
		flushSize:      4096,
		streamMode:     false,
	}

	// 写入数据
	gw.Write([]byte("test data"))

	// 调用 Flush
	gw.Flush()

	// 验证 buffered 被重置
	assert.Equal(t, 0, gw.buffered)
}

// TestWriteEscapedString 测试字符串转义（间接测试 OrderedMap.MarshalJSON）
func TestShouldSkipCompression(t *testing.T) {
	testCases := []struct {
		path     string
		expected bool
	}{
		{"/test.jpg", true},
		{"/test.png", true},
		{"/test.gif", true},
		{"/test.webp", true},
		{"/test.ico", true},
		{"/test.zip", true},
		{"/test.gz", true},
		{"/test.tar.gz", true},
		{"/test.mp4", true},
		{"/api/data", false},
		{"/test.js", false},
		{"/test.css", false},
		{"/test.html", false},
	}

	for _, tc := range testCases {
		t.Run(tc.path, func(t *testing.T) {
			result := shouldSkipCompression(tc.path)
			assert.Equal(t, tc.expected, result)
		})
	}
}
