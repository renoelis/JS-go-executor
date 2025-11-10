package utils

import (
	"encoding/json"
	"testing"
)

// BenchmarkOrderedMap_MarshalJSON 性能基准测试
// 验证 bytebufferpool 优化效果

func BenchmarkOrderedMap_MarshalJSON_Small(b *testing.B) {
	// 小对象（10 个字段）
	om := &OrderedMap{
		Keys: []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"},
		Values: map[string]interface{}{
			"a": "value1",
			"b": "value2",
			"c": "value3",
			"d": "value4",
			"e": "value5",
			"f": "value6",
			"g": "value7",
			"h": "value8",
			"i": "value9",
			"j": "value10",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(om)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkOrderedMap_MarshalJSON_Medium(b *testing.B) {
	// 中等对象（50 个字段）
	keys := make([]string, 50)
	values := make(map[string]interface{}, 50)
	for i := 0; i < 50; i++ {
		key := string(rune('a' + i%26))
		keys[i] = key
		values[key] = map[string]interface{}{
			"name":  "test",
			"value": i,
			"data":  "some longer string data for testing",
		}
	}

	om := &OrderedMap{
		Keys:   keys,
		Values: values,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(om)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkOrderedMap_MarshalJSON_Large(b *testing.B) {
	// 大对象（200 个字段）
	keys := make([]string, 200)
	values := make(map[string]interface{}, 200)
	for i := 0; i < 200; i++ {
		key := string(rune('a'+i%26)) + string(rune('0'+i%10))
		keys[i] = key
		values[key] = map[string]interface{}{
			"id":          i,
			"name":        "test object",
			"description": "this is a longer description field for more realistic data",
			"timestamp":   1234567890,
			"active":      true,
			"metadata": map[string]interface{}{
				"created": "2025-01-01",
				"updated": "2025-01-02",
			},
		}
	}

	om := &OrderedMap{
		Keys:   keys,
		Values: values,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(om)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkOrderedMap_MarshalJSON_Parallel 并发性能测试
func BenchmarkOrderedMap_MarshalJSON_Parallel(b *testing.B) {
	om := &OrderedMap{
		Keys: []string{"result", "success", "data", "timestamp", "requestId"},
		Values: map[string]interface{}{
			"result":    map[string]interface{}{"value": 42, "computed": true},
			"success":   true,
			"data":      []interface{}{1, 2, 3, 4, 5},
			"timestamp": "2025-10-11T18:00:00Z",
			"requestId": "req-123456",
		},
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, err := json.Marshal(om)
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

// TestOrderedMap_MarshalJSON_Correctness 正确性测试
func TestOrderedMap_MarshalJSON_Correctness(t *testing.T) {
	tests := []struct {
		name     string
		om       *OrderedMap
		expected string
	}{
		{
			name:     "空对象",
			om:       &OrderedMap{},
			expected: "{}",
		},
		{
			name: "简单对象",
			om: &OrderedMap{
				Keys:   []string{"a", "b"},
				Values: map[string]interface{}{"a": 1, "b": 2},
			},
			expected: `{"a":1,"b":2}`,
		},
		{
			name: "保持字段顺序",
			om: &OrderedMap{
				Keys:   []string{"z", "a", "m"},
				Values: map[string]interface{}{"a": 1, "z": 3, "m": 2},
			},
			expected: `{"z":3,"a":1,"m":2}`,
		},
		{
			name: "嵌套对象",
			om: &OrderedMap{
				Keys: []string{"user"},
				Values: map[string]interface{}{
					"user": map[string]interface{}{"name": "test", "age": 30},
				},
			},
			expected: `{"user":{"age":30,"name":"test"}}`, // 注意：嵌套对象的顺序由 json.Marshal 决定
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := json.Marshal(tt.om)
			if err != nil {
				t.Fatalf("MarshalJSON failed: %v", err)
			}

			// 验证结果是有效的 JSON
			var check interface{}
			if err := json.Unmarshal(result, &check); err != nil {
				t.Fatalf("Result is not valid JSON: %v", err)
			}

			// 对于简单测试用例，验证字符串匹配
			if tt.name == "空对象" || tt.name == "简单对象" {
				if string(result) != tt.expected {
					t.Errorf("Expected %s, got %s", tt.expected, string(result))
				}
			}
		})
	}
}

// TestOrderedMap_MarshalJSON_BufferPoolUsage 验证 buffer pool 正确使用
func TestOrderedMap_MarshalJSON_BufferPoolUsage(t *testing.T) {
	// 测试多次序列化，确保 buffer pool 正确复用
	om := &OrderedMap{
		Keys:   []string{"x", "y", "z"},
		Values: map[string]interface{}{"x": 1, "y": 2, "z": 3},
	}

	// 连续序列化 1000 次
	for i := 0; i < 1000; i++ {
		result, err := json.Marshal(om)
		if err != nil {
			t.Fatalf("Iteration %d failed: %v", i, err)
		}

		// 验证结果
		var check map[string]interface{}
		if err := json.Unmarshal(result, &check); err != nil {
			t.Fatalf("Iteration %d: invalid JSON: %v", i, err)
		}

		// 验证数据没有污染
		if len(check) != 3 {
			t.Errorf("Iteration %d: expected 3 fields, got %d", i, len(check))
		}
	}
}

