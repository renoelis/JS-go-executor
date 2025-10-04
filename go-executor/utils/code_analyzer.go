package utils

import (
	"regexp"
	"strings"
)

// CodeAnalyzer 代码分析器
// 🔥 优化点6：智能检测代码特征，决定使用 Runtime 池还是 EventLoop
type CodeAnalyzer struct {
	// 异步模式正则表达式
	asyncPatterns []*regexp.Regexp
}

// NewCodeAnalyzer 创建代码分析器
func NewCodeAnalyzer() *CodeAnalyzer {
	return &CodeAnalyzer{
		asyncPatterns: []*regexp.Regexp{
			// Promise 相关（EventLoop 支持）
			regexp.MustCompile(`\bnew\s+Promise\b`),
			regexp.MustCompile(`\bPromise\.`),
			regexp.MustCompile(`\.then\s*\(`),
			regexp.MustCompile(`\.catch\s*\(`),
			regexp.MustCompile(`\.finally\s*\(`),

			// 定时器（EventLoop 支持）
			regexp.MustCompile(`\bsetTimeout\s*\(`),
			regexp.MustCompile(`\bsetInterval\s*\(`),
			regexp.MustCompile(`\bsetImmediate\s*\(`),

			// 特殊注释标记（用户可以强制指定）
			regexp.MustCompile(`//\s*@async`),
			regexp.MustCompile(`/\*\s*@async\s*\*/`),
		},
	}
}

// CodeFeatures 代码特征分析结果
type CodeFeatures struct {
	IsAsync       bool     // 是否包含异步操作
	AsyncReasons  []string // 检测到的异步特征
	EstimatedType string   // 估计类型: "sync" 或 "async"
	UseEventLoop  bool     // 是否应该使用 EventLoop
}

// AnalyzeCode 分析代码特征
// 🔥 核心方法：决定代码执行策略
func (ca *CodeAnalyzer) AnalyzeCode(code string) *CodeFeatures {
	features := &CodeFeatures{
		IsAsync:       false,
		AsyncReasons:  make([]string, 0),
		EstimatedType: "sync",
		UseEventLoop:  false,
	}

	// 移除字符串字面量和注释（避免误判）
	cleanedCode := ca.removeStringsAndComments(code)

	// 检测异步模式
	for _, pattern := range ca.asyncPatterns {
		if matches := pattern.FindAllString(cleanedCode, -1); len(matches) > 0 {
			features.IsAsync = true
			features.AsyncReasons = append(features.AsyncReasons, matches[0])
		}
	}

	// 决定执行策略
	if features.IsAsync {
		features.EstimatedType = "async"
		features.UseEventLoop = true
	} else {
		features.EstimatedType = "sync"
		features.UseEventLoop = false
	}

	return features
}

// removeStringsAndComments 移除字符串和注释（避免误判）
func (ca *CodeAnalyzer) removeStringsAndComments(code string) string {
	var result strings.Builder
	inString := false
	inComment := false
	inMultiComment := false
	stringChar := byte(0)

	for i := 0; i < len(code); i++ {
		ch := code[i]

		// 处理多行注释
		if !inString && !inComment && i+1 < len(code) && ch == '/' && code[i+1] == '*' {
			inMultiComment = true
			i++
			continue
		}
		if inMultiComment && i+1 < len(code) && ch == '*' && code[i+1] == '/' {
			inMultiComment = false
			i++
			continue
		}
		if inMultiComment {
			result.WriteByte(' ')
			continue
		}

		// 处理单行注释
		if !inString && !inComment && i+1 < len(code) && ch == '/' && code[i+1] == '/' {
			inComment = true
			i++
			continue
		}
		if inComment && ch == '\n' {
			inComment = false
			result.WriteByte('\n')
			continue
		}
		if inComment {
			result.WriteByte(' ')
			continue
		}

		// 处理字符串
		if !inString && (ch == '"' || ch == '\'' || ch == '`') {
			inString = true
			stringChar = ch
			result.WriteByte(' ')
			continue
		}
		if inString && ch == stringChar {
			// 检查是否是转义
			if i > 0 && code[i-1] != '\\' {
				inString = false
				stringChar = 0
			}
			result.WriteByte(' ')
			continue
		}
		if inString {
			result.WriteByte(' ')
			continue
		}

		// 正常字符
		result.WriteByte(ch)
	}

	return result.String()
}

// IsLikelyAsync 快速判断（不做详细分析）
// 用于性能敏感场景
// 注意：async/await 不在检测列表中，因为 goja 不支持
func (ca *CodeAnalyzer) IsLikelyAsync(code string) bool {
	// 快速关键字检测（仅检测 goja 支持的异步特性）
	quickPatterns := []string{
		"Promise",
		".then(",
		"setTimeout",
		"setInterval",
		"setImmediate",
	}

	for _, pattern := range quickPatterns {
		if strings.Contains(code, pattern) {
			return true
		}
	}

	return false
}

// ShouldUseRuntimePool 是否应该使用 Runtime 池
// 🔥 决策方法：同步代码 → 使用池，异步代码 → 使用 EventLoop
func (ca *CodeAnalyzer) ShouldUseRuntimePool(code string) bool {
	// 快速检测（性能优先）
	if ca.IsLikelyAsync(code) {
		return false // 使用 EventLoop
	}

	// 详细分析（确认）
	features := ca.AnalyzeCode(code)
	return !features.UseEventLoop
}
