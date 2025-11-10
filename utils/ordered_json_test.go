package utils

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestOrderedMap_MarshalJSON 测试基本的 JSON 序列化
func TestOrderedMap_MarshalJSON(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"name", "age", "city"},
		Values: map[string]interface{}{
			"name": "Alice",
			"age":  30,
			"city": "Beijing",
		},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)

	// 验证顺序保持
	expected := `{"name":"Alice","age":30,"city":"Beijing"}`
	assert.JSONEq(t, expected, string(data))

	// 验证字段顺序（精确匹配）
	assert.Equal(t, expected, string(data))
}

// TestOrderedMap_MarshalJSON_EmptyMap 测试空 Map
func TestOrderedMap_MarshalJSON_EmptyMap(t *testing.T) {
	om := &OrderedMap{
		Keys:   []string{},
		Values: map[string]interface{}{},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)
	assert.Equal(t, "{}", string(data))
}

// TestOrderedMap_MarshalJSON_NilMap 测试 nil Map
func TestOrderedMap_MarshalJSON_NilMap(t *testing.T) {
	var om *OrderedMap

	data, err := json.Marshal(om)
	assert.NoError(t, err)
	assert.Equal(t, "null", string(data))
}

// TestOrderedMap_MarshalJSON_SpecialCharacters 测试特殊字符转义
func TestOrderedMap_MarshalJSON_SpecialCharacters(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"quote", "backslash", "newline", "tab"},
		Values: map[string]interface{}{
			"quote":     `He said "hello"`,
			"backslash": `C:\path\to\file`,
			"newline":   "line1\nline2",
			"tab":       "col1\tcol2",
		},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)

	// 验证可以反序列化
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	assert.NoError(t, err)

	assert.Equal(t, `He said "hello"`, result["quote"])
	assert.Equal(t, `C:\path\to\file`, result["backslash"])
	assert.Equal(t, "line1\nline2", result["newline"])
	assert.Equal(t, "col1\tcol2", result["tab"])
}

// TestOrderedMap_MarshalJSON_Unicode 测试 Unicode 字符
func TestOrderedMap_MarshalJSON_Unicode(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"chinese", "emoji"},
		Values: map[string]interface{}{
			"chinese": "你好世界",
			"emoji":   "😊👍🎉",
		},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)

	// 验证可以反序列化
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	assert.NoError(t, err)

	assert.Equal(t, "你好世界", result["chinese"])
	assert.Equal(t, "😊👍🎉", result["emoji"])
}

// TestOrderedMap_MarshalJSON_NestedStructures 测试嵌套结构
func TestOrderedMap_MarshalJSON_NestedStructures(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"user", "tags", "count"},
		Values: map[string]interface{}{
			"user": map[string]interface{}{
				"name": "Bob",
				"age":  25,
			},
			"tags":  []string{"go", "testing", "json"},
			"count": 42,
		},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)

	// 验证可以反序列化
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	assert.NoError(t, err)

	assert.Equal(t, "Bob", result["user"].(map[string]interface{})["name"])
	assert.Equal(t, 42.0, result["count"]) // JSON 数字会被解析为 float64
}

// TestOrderedMap_MarshalJSON_NullValues 测试 null 值
func TestOrderedMap_MarshalJSON_NullValues(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"name", "nullable", "number"},
		Values: map[string]interface{}{
			"name":     "Alice",
			"nullable": nil,
			"number":   0,
		},
	}

	data, err := json.Marshal(om)
	assert.NoError(t, err)

	expected := `{"name":"Alice","nullable":null,"number":0}`
	assert.JSONEq(t, expected, string(data))
}

// TestOrderedMap_MarshalJSON_Escaping 测试字符串转义（通过 jsoniter）
func TestOrderedMap_MarshalJSON_Escaping(t *testing.T) {
	testCases := []struct {
		name     string
		key      string
		value    string
		checkKey string // 检查序列化后的 key
	}{
		{
			name:     "Normal string",
			key:      "field",
			value:    "hello world",
			checkKey: `"field"`,
		},
		{
			name:     "Quote in value",
			key:      "message",
			value:    `say "hello"`,
			checkKey: `"message"`,
		},
		{
			name:     "Backslash in value",
			key:      "path",
			value:    `C:\path\to\file`,
			checkKey: `"path"`,
		},
		{
			name:     "Special chars in key",
			key:      `key"with"quotes`,
			value:    "value",
			checkKey: `"key\"with\"quotes"`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			om := &OrderedMap{
				Keys:   []string{tc.key},
				Values: map[string]interface{}{tc.key: tc.value},
			}

			data, err := json.Marshal(om)
			assert.NoError(t, err)

			// 验证可以反序列化
			var result map[string]interface{}
			err = json.Unmarshal(data, &result)
			assert.NoError(t, err)
			assert.Equal(t, tc.value, result[tc.key])
		})
	}
}

// TestOrderedMap_UnmarshalJSON 测试反序列化
func TestOrderedMap_UnmarshalJSON(t *testing.T) {
	jsonStr := `{"name":"Alice","age":30,"city":"Beijing"}`

	om := &OrderedMap{}
	err := json.Unmarshal([]byte(jsonStr), om)
	assert.NoError(t, err)

	assert.Equal(t, "Alice", om.Values["name"])
	assert.Equal(t, 30.0, om.Values["age"]) // JSON 数字解析为 float64
	assert.Equal(t, "Beijing", om.Values["city"])
	assert.Len(t, om.Keys, 3)
}

// TestOrderedMap_Get 测试 Get 方法
func TestOrderedMap_Get(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"name", "age"},
		Values: map[string]interface{}{
			"name": "Bob",
			"age":  25,
		},
	}

	// 存在的 key
	value, exists := om.Get("name")
	assert.True(t, exists)
	assert.Equal(t, "Bob", value)

	// 不存在的 key
	value, exists = om.Get("city")
	assert.False(t, exists)
	assert.Nil(t, value)
}

// TestOrderedMap_Get_NilMap 测试 nil Map 的 Get
func TestOrderedMap_Get_NilMap(t *testing.T) {
	var om *OrderedMap

	value, exists := om.Get("name")
	assert.False(t, exists)
	assert.Nil(t, value)
}

// TestOrderedMap_ToMap 测试 ToMap 方法
func TestOrderedMap_ToMap(t *testing.T) {
	om := &OrderedMap{
		Keys: []string{"name", "age"},
		Values: map[string]interface{}{
			"name": "Charlie",
			"age":  35,
		},
	}

	m := om.ToMap()
	assert.Equal(t, "Charlie", m["name"])
	assert.Equal(t, 35, m["age"])
}

// TestOrderedMap_ToMap_NilMap 测试 nil Map 的 ToMap
func TestOrderedMap_ToMap_NilMap(t *testing.T) {
	var om *OrderedMap

	m := om.ToMap()
	assert.Nil(t, m)
}

// BenchmarkOrderedMap_MarshalJSON 基准测试
func BenchmarkOrderedMap_MarshalJSON(b *testing.B) {
	om := &OrderedMap{
		Keys: []string{"name", "age", "city", "email", "phone"},
		Values: map[string]interface{}{
			"name":  "Benchmark User",
			"age":   30,
			"city":  "Beijing",
			"email": "user@example.com",
			"phone": "+86-123-4567-8900",
		},
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(om)
	}
}

// BenchmarkOrderedMap_MarshalJSON_LargeData 大数据基准测试
func BenchmarkOrderedMap_MarshalJSON_LargeData(b *testing.B) {
	// 创建一个有 100 个字段的 OrderedMap
	keys := make([]string, 100)
	values := make(map[string]interface{})

	for i := 0; i < 100; i++ {
		key := "field_" + strings.Repeat("x", i%10)
		keys[i] = key
		values[key] = "value_" + strings.Repeat("y", i%10)
	}

	om := &OrderedMap{
		Keys:   keys,
		Values: values,
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(om)
	}
}

// BenchmarkOrderedMap_MarshalJSON_WithEscaping 带转义的序列化基准测试
func BenchmarkOrderedMap_MarshalJSON_WithEscaping(b *testing.B) {
	om := &OrderedMap{
		Keys: []string{"message", "path", "newline"},
		Values: map[string]interface{}{
			"message": `say "hello"`,
			"path":    `C:\path\to\file`,
			"newline": "line1\nline2\ttab",
		},
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(om)
	}
}

// BenchmarkStandardJSONMarshal 标准 JSON 序列化基准测试（对比）
func BenchmarkStandardJSONMarshal(b *testing.B) {
	m := map[string]interface{}{
		"name":  "Benchmark User",
		"age":   30,
		"city":  "Beijing",
		"email": "user@example.com",
		"phone": "+86-123-4567-8900",
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, _ = json.Marshal(m)
	}
}
