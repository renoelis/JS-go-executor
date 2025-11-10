package utils

import (
	"strings"
	"testing"
)

// TestCodeLexer_SingleLineComment 测试单行注释识别
func TestCodeLexer_SingleLineComment(t *testing.T) {
	code := `// 这是单行注释 while(true)
const x = 1;`

	lexer := NewCodeLexer(code)
	var cleaned strings.Builder

	codeBytes := lexer.GetCode()
	for {
		token := lexer.NextToken()
		if token.Type == TokenEOF {
			break
		}

		if token.Type == TokenCode {
			cleaned.Write(codeBytes[token.Start:token.End])
		} else {
			// 注释和字符串替换为空格
			for i := token.Start; i < token.End; i++ {
				if codeBytes[i] == '\n' {
					cleaned.WriteByte('\n')
				} else {
					cleaned.WriteByte(' ')
				}
			}
		}
	}

	result := cleaned.String()

	// 检查：注释应该被替换为空格
	if strings.Contains(result, "这是单行注释") {
		t.Errorf("单行注释未被正确移除")
	}

	// 检查：注释中的 while(true) 应该被移除
	if strings.Contains(result, "while(true)") {
		t.Errorf("注释中的 while(true) 未被移除")
	}

	// 检查：实际代码应该保留
	if !strings.Contains(result, "const x = 1;") {
		t.Errorf("实际代码被错误移除")
	}
}

// TestCodeLexer_MultiLineComment 测试多行注释识别
func TestCodeLexer_MultiLineComment(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		contains    []string // 应该包含的内容
		notContains []string // 不应该包含的内容
	}{
		{
			name: "标准多行注释",
			code: `/*
 * 这是多行注释
 * while(true) for(;;)
 */
const y = 2;`,
			contains:    []string{"const y = 2;"},
			notContains: []string{"这是多行注释", "while(true)", "for(;;)"},
		},
		{
			name: "单行形式的多行注释",
			code: `/* 单行多行注释 while(1) */
const z = 3;`,
			contains:    []string{"const z = 3;"},
			notContains: []string{"单行多行注释", "while(1)"},
		},
		{
			name:        "嵌套在代码中的多行注释",
			code:        `const a = 1; /* 中间注释 while(true) */ const b = 2;`,
			contains:    []string{"const a = 1;", "const b = 2;"},
			notContains: []string{"中间注释", "while(true)"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lexer := NewCodeLexer(tt.code)
			var cleaned strings.Builder

			codeBytes := lexer.GetCode()
			for {
				token := lexer.NextToken()
				if token.Type == TokenEOF {
					break
				}

				if token.Type == TokenCode {
					cleaned.Write(codeBytes[token.Start:token.End])
				} else {
					for i := token.Start; i < token.End; i++ {
						if codeBytes[i] == '\n' {
							cleaned.WriteByte('\n')
						} else {
							cleaned.WriteByte(' ')
						}
					}
				}
			}

			result := cleaned.String()

			// 检查应该包含的内容
			for _, s := range tt.contains {
				if !strings.Contains(result, s) {
					t.Errorf("结果中缺少预期内容: %s\n结果: %s", s, result)
				}
			}

			// 检查不应该包含的内容
			for _, s := range tt.notContains {
				if strings.Contains(result, s) {
					t.Errorf("结果中包含不应该出现的内容: %s\n结果: %s", s, result)
				}
			}
		})
	}
}

// TestCodeLexer_Strings 测试字符串识别
func TestCodeLexer_Strings(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		contains    []string
		notContains []string
	}{
		{
			name:        "双引号字符串",
			code:        `const msg = "string with while(true) keyword"; const x = 1;`,
			contains:    []string{"const msg =", "const x = 1;"},
			notContains: []string{"string with while(true) keyword"},
		},
		{
			name:        "单引号字符串",
			code:        `const msg = 'string with for(;;) keyword'; const y = 2;`,
			contains:    []string{"const msg =", "const y = 2;"},
			notContains: []string{"string with for(;;) keyword"},
		},
		{
			name:        "模板字符串",
			code:        "const msg = `template with while(1) keyword`; const z = 3;",
			contains:    []string{"const msg =", "const z = 3;"},
			notContains: []string{"template with while(1) keyword"},
		},
		{
			name:        "包含转义字符的字符串",
			code:        `const msg = "string with \" quote and while(true)"; const a = 4;`,
			contains:    []string{"const msg =", "const a = 4;"},
			notContains: []string{"string with", "quote and while(true)"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lexer := NewCodeLexer(tt.code)
			var cleaned strings.Builder

			codeBytes := lexer.GetCode()
			for {
				token := lexer.NextToken()
				if token.Type == TokenEOF {
					break
				}

				if token.Type == TokenCode {
					cleaned.Write(codeBytes[token.Start:token.End])
				} else {
					for i := token.Start; i < token.End; i++ {
						if codeBytes[i] == '\n' {
							cleaned.WriteByte('\n')
						} else {
							cleaned.WriteByte(' ')
						}
					}
				}
			}

			result := cleaned.String()

			for _, s := range tt.contains {
				if !strings.Contains(result, s) {
					t.Errorf("结果中缺少预期内容: %s\n结果: %s", s, result)
				}
			}

			for _, s := range tt.notContains {
				if strings.Contains(result, s) {
					t.Errorf("结果中包含不应该出现的内容: %s\n结果: %s", s, result)
				}
			}
		})
	}
}

// TestCodeLexer_MixedContent 测试混合内容
func TestCodeLexer_MixedContent(t *testing.T) {
	code := `// 单行注释 while(true)
const msg1 = "字符串中的 for(;;) 关键字";
/* 多行注释 while(1) */
const msg2 = 'another string with console.log';
// 另一个注释
const result = msg1 + msg2;
/* 
 * 多行
 * 注释
 * while(true)
 */`

	lexer := NewCodeLexer(code)
	var cleaned strings.Builder

	codeBytes := lexer.GetCode()
	for {
		token := lexer.NextToken()
		if token.Type == TokenEOF {
			break
		}

		if token.Type == TokenCode {
			cleaned.Write(codeBytes[token.Start:token.End])
		} else {
			for i := token.Start; i < token.End; i++ {
				if codeBytes[i] == '\n' {
					cleaned.WriteByte('\n')
				} else {
					cleaned.WriteByte(' ')
				}
			}
		}
	}

	result := cleaned.String()

	// 应该保留的实际代码
	shouldContain := []string{
		"const msg1 =",
		"const msg2 =",
		"const result = msg1 + msg2;",
	}

	// 不应该包含的注释和字符串内容
	shouldNotContain := []string{
		"单行注释",
		"多行注释",
		"字符串中的",
		"for(;;)",
		"another string",
		"console.log",
		"while(true)",
		"while(1)",
	}

	for _, s := range shouldContain {
		if !strings.Contains(result, s) {
			t.Errorf("结果中缺少实际代码: %s\n完整结果:\n%s", s, result)
		}
	}

	for _, s := range shouldNotContain {
		if strings.Contains(result, s) {
			t.Errorf("结果中包含了注释或字符串内容: %s\n完整结果:\n%s", s, result)
		}
	}
}

// TestCodeLexer_EdgeCases 测试边界情况
func TestCodeLexer_EdgeCases(t *testing.T) {
	tests := []struct {
		name                    string
		code                    string
		expectedCleanedContains string
	}{
		{
			name:                    "空代码",
			code:                    "",
			expectedCleanedContains: "",
		},
		{
			name:                    "只有注释",
			code:                    "// just a comment",
			expectedCleanedContains: "",
		},
		{
			name:                    "只有多行注释",
			code:                    "/* just a comment */",
			expectedCleanedContains: "",
		},
		{
			name:                    "未闭合的字符串",
			code:                    `const msg = "unclosed string`,
			expectedCleanedContains: "const msg =",
		},
		{
			name:                    "未闭合的多行注释",
			code:                    `const x = 1; /* unclosed comment`,
			expectedCleanedContains: "const x = 1;",
		},
		{
			name: "连续的注释",
			code: `// comment 1
// comment 2
// comment 3
const x = 1;`,
			expectedCleanedContains: "const x = 1;",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lexer := NewCodeLexer(tt.code)
			var cleaned strings.Builder

			codeBytes := lexer.GetCode()
			for {
				token := lexer.NextToken()
				if token.Type == TokenEOF {
					break
				}

				if token.Type == TokenCode {
					cleaned.Write(codeBytes[token.Start:token.End])
				} else {
					for i := token.Start; i < token.End; i++ {
						if codeBytes[i] == '\n' {
							cleaned.WriteByte('\n')
						} else {
							cleaned.WriteByte(' ')
						}
					}
				}
			}

			result := strings.TrimSpace(cleaned.String())

			if tt.expectedCleanedContains != "" {
				if !strings.Contains(result, tt.expectedCleanedContains) {
					t.Errorf("预期包含 '%s'，但结果为: '%s'", tt.expectedCleanedContains, result)
				}
			}
		})
	}
}
