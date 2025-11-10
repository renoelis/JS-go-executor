package utils

import (
	"strings"
	"testing"
)

// TestCodeAnalyzer_EscapeCharacterFix 测试 v2.4.4 转义字符修复
func TestCodeAnalyzer_EscapeCharacterFix(t *testing.T) {
	analyzer := NewCodeAnalyzer()

	tests := []struct {
		name             string
		code             string
		shouldContain    string // 移除字符串后应该包含的内容
		shouldNotContain string // 移除字符串后不应该包含的内容
	}{
		{
			name:             "正常字符串",
			code:             `"hello" world`,
			shouldContain:    "world",
			shouldNotContain: "hello",
		},
		{
			name:             "转义的引号",
			code:             `"test\"quote" end`,
			shouldContain:    "end",
			shouldNotContain: "test",
		},
		{
			name:             "v2.4.4修复：转义的反斜杠+结束引号",
			code:             `"test\\" after`,
			shouldContain:    "after",
			shouldNotContain: "test",
		},
		{
			name:             "双重转义的反斜杠",
			code:             `"test\\\\" after`,
			shouldContain:    "after",
			shouldNotContain: "test",
		},
		{
			name:             "多个转义反斜杠",
			code:             `"a\\b\\c\\" after`,
			shouldContain:    "after",
			shouldNotContain: "abc",
		},
		{
			name:             "async关键字在字符串后",
			code:             `var s = "test\\"; await fetch(url);`,
			shouldContain:    "await",
			shouldNotContain: "test",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := analyzer.removeStringsAndComments(tt.code)

			if tt.shouldContain != "" && !strings.Contains(result, tt.shouldContain) {
				t.Errorf("Expected result to contain %q, got %q", tt.shouldContain, result)
			}

			if tt.shouldNotContain != "" && strings.Contains(result, tt.shouldNotContain) {
				t.Errorf("Expected result NOT to contain %q, got %q", tt.shouldNotContain, result)
			}
		})
	}
}

// TestCodeAnalyzer_AsyncDetection_WithEscapes 测试异步检测（带转义字符）
func TestCodeAnalyzer_AsyncDetection_WithEscapes(t *testing.T) {
	analyzer := NewCodeAnalyzer()

	tests := []struct {
		name        string
		code        string
		expectAsync bool
	}{
		{
			name:        "await 在字符串中（应该是同步）",
			code:        `var s = "await"; return s;`,
			expectAsync: false,
		},
		{
			name:        "await 在注释中（应该是同步）",
			code:        `// await here\nreturn 1;`,
			expectAsync: false,
		},
		{
			name:        "await 在实际代码中（应该是异步）",
			code:        `await fetch(url); return data;`,
			expectAsync: true,
		},
		{
			name:        "v2.4.4修复：字符串后的 await",
			code:        `var s = "test\\"; await fetch(url);`,
			expectAsync: true, // 修复后应该正确检测到 await
		},
		{
			name:        "复杂情况：多个转义+await",
			code:        `var s = "a\\\\b\\\\c\\\\"; await promise;`,
			expectAsync: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			features := analyzer.AnalyzeCode(tt.code)

			if features.IsAsync != tt.expectAsync {
				t.Errorf("Expected IsAsync=%v, got %v\nCode: %s\nCleaned: %s",
					tt.expectAsync, features.IsAsync, tt.code,
					analyzer.removeStringsAndComments(tt.code))
			}
		})
	}
}

// TestCodeAnalyzer_EscapeBugReproduction 重现原始 bug
func TestCodeAnalyzer_EscapeBugReproduction(t *testing.T) {
	analyzer := NewCodeAnalyzer()

	// 这是会触发原始 bug 的代码
	buggyCode := `var path = "C:\\Users\\"; await loadFile(path);`

	cleaned := analyzer.removeStringsAndComments(buggyCode)

	// 修复后，await 应该被保留（在实际代码中）
	if !strings.Contains(cleaned, "await") {
		t.Errorf("Bug 未修复：await 关键字被误删除\nCode: %s\nCleaned: %s", buggyCode, cleaned)
	}

	// 修复后，字符串内容应该被移除
	if strings.Contains(cleaned, "Users") {
		t.Errorf("字符串内容应该被移除\nCleaned: %s", cleaned)
	}

	// 验证异步检测
	features := analyzer.AnalyzeCode(buggyCode)
	if !features.IsAsync {
		t.Errorf("应该检测为异步代码（包含 await）")
	}
}

// BenchmarkCodeAnalyzer_RemoveStringsAndComments 性能基准测试
func BenchmarkCodeAnalyzer_RemoveStringsAndComments(b *testing.B) {
	analyzer := NewCodeAnalyzer()
	code := `
var s = "test\\" + "other";
// comment with await
/* multi
   line comment */
var data = await fetch(url);
return data;
`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		analyzer.removeStringsAndComments(code)
	}
}
