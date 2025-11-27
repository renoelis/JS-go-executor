package utils

// code_lexer.go - 统一的 JavaScript 代码词法分析器
// 🔥 重构目标：消除 removeStringsAndComments, removeCommentsAndStrings, findConsoleInActualCode 的代码重复
// 📝 设计原则：单一职责，词法分析与业务逻辑分离

// TokenType 词法单元类型
type TokenType int

const (
	TokenCode    TokenType = iota // 普通代码字符
	TokenString                   // 字符串字面量
	TokenComment                  // 注释（单行或多行）
	TokenEOF                      // 文件结束
)

// Token 词法单元
type Token struct {
	Type  TokenType
	Start int // 起始位置（字节索引）
	End   int // 结束位置（字节索引）
}

// CodeLexer JavaScript 代码词法分析器
// 🔥 功能：识别代码中的字符串、注释和普通代码
// 📝 支持：
//   - 单行注释：// ...
//   - 多行注释：/* ... */
//   - 字符串：双引号 "...", 单引号 '...', 模板字符串 `...`
//   - 转义字符：正确处理 \", \', \\, \n 等
type CodeLexer struct {
	code    []byte // 源代码（字节数组，避免字符串切片开销）
	pos     int    // 当前读取位置
	pending []Token
}

// NewCodeLexer 创建新的词法分析器
func NewCodeLexer(code string) *CodeLexer {
	return &CodeLexer{
		code: []byte(code),
		pos:  0,
	}
}

// NextToken 获取下一个词法单元
// 🔥 核心方法：解析代码，返回下一个 token
// 返回值：Token 结构，包含类型和位置信息
func (cl *CodeLexer) NextToken() Token {
	if len(cl.pending) > 0 {
		t := cl.pending[0]
		cl.pending = cl.pending[1:]
		return t
	}

	// 文件结束
	if cl.pos >= len(cl.code) {
		return Token{Type: TokenEOF, Start: cl.pos, End: cl.pos}
	}

	start := cl.pos
	ch := cl.code[cl.pos]

	// 检查注释（必须在字符串之前检查）
	if ch == '/' && cl.pos+1 < len(cl.code) {
		next := cl.code[cl.pos+1]
		if next == '/' {
			// 单行注释：// ...
			return cl.scanSingleLineComment(start)
		} else if next == '*' {
			// 多行注释：/* ... */
			return cl.scanMultiLineComment(start)
		}
	}

	// 检查字符串
	if ch == '"' || ch == '\'' || ch == '`' {
		return cl.scanString(start, ch)
	}

	// 普通代码字符
	cl.pos++
	return Token{Type: TokenCode, Start: start, End: cl.pos}
}

// scanSingleLineComment 扫描单行注释
// 从 // 开始，到行尾或文件结束
func (cl *CodeLexer) scanSingleLineComment(start int) Token {
	cl.pos += 2 // 跳过 //

	// 读取到行尾
	for cl.pos < len(cl.code) && cl.code[cl.pos] != '\n' {
		cl.pos++
	}

	// 注意：不包含换行符本身（换行符留给下一个 token）
	return Token{Type: TokenComment, Start: start, End: cl.pos}
}

// scanMultiLineComment 扫描多行注释
// 从 /* 开始，到 */ 结束（或文件结束）
func (cl *CodeLexer) scanMultiLineComment(start int) Token {
	cl.pos += 2 // 跳过 /*

	// 查找 */
	for cl.pos < len(cl.code) {
		if cl.code[cl.pos] == '*' && cl.pos+1 < len(cl.code) && cl.code[cl.pos+1] == '/' {
			cl.pos += 2 // 跳过 */
			return Token{Type: TokenComment, Start: start, End: cl.pos}
		}
		cl.pos++
	}

	// 未闭合的多行注释（到文件结束）
	return Token{Type: TokenComment, Start: start, End: cl.pos}
}

// scanString 扫描字符串字面量
// 支持双引号、单引号、反引号（模板字符串）
// 🔥 关键：正确处理转义字符（v2.4.4 修复）
func (cl *CodeLexer) scanString(start int, quote byte) Token {
	if quote == '`' {
		return cl.scanTemplateLiteral(start)
	}

	cl.pos++ // 跳过开始引号

	// 读取到结束引号
	for cl.pos < len(cl.code) {
		ch := cl.code[cl.pos]

		if ch == quote {
			// 🔥 检查是否被转义
			// 统计前面连续的反斜杠数量
			escapeCount := 0
			for i := cl.pos - 1; i >= start+1 && cl.code[i] == '\\'; i-- {
				escapeCount++
			}

			// 奇数个反斜杠 = 引号被转义（字符串继续）
			// 偶数个反斜杠（包括0）= 引号未转义（字符串结束）
			if escapeCount%2 == 0 {
				cl.pos++ // 跳过结束引号
				return Token{Type: TokenString, Start: start, End: cl.pos}
			}
		}

		// 模板字符串的特殊处理
		// 注意：当前实现，将 ${...} 视为字符串的一部分
		// 已完整实现需要递归解析 ${} 内的表达式

		cl.pos++
	}

	// 未闭合的字符串（到文件结束）
	return Token{Type: TokenString, Start: start, End: cl.pos}
}

func (cl *CodeLexer) scanTemplateLiteral(start int) Token {
	length := len(cl.code)
	i := start + 1
	textStart := start

	for i < length {
		ch := cl.code[i]

		if ch == '\\' && i+1 < length {
			i += 2
			continue
		}

		if ch == '$' && i+1 < length && cl.code[i+1] == '{' {
			if textStart < i {
				cl.pending = append(cl.pending, Token{Type: TokenString, Start: textStart, End: i})
			}

			exprStart := i + 2
			exprEnd := cl.scanTemplateExpressionEnd(exprStart)
			if exprEnd < exprStart {
				exprEnd = exprStart
			}
			if exprStart < exprEnd {
				inner := NewCodeLexer(string(cl.code[exprStart:exprEnd]))
				innerCode := inner.GetCode()
				for {
					t := inner.NextToken()
					if t.Type == TokenEOF {
						break
					}
					mapped := Token{
						Type:  t.Type,
						Start: exprStart + (t.Start),
						End:   exprStart + (t.End),
					}
					_ = innerCode
					cl.pending = append(cl.pending, mapped)
				}
			}

			i = exprEnd
			textStart = exprEnd
			continue
		}

		if ch == '`' {
			if textStart < i+1 {
				cl.pending = append(cl.pending, Token{Type: TokenString, Start: textStart, End: i + 1})
			}
			cl.pos = i + 1
			break
		}

		i++
	}

	if cl.pos < start+1 {
		cl.pos = length
	}
	if textStart < cl.pos && (len(cl.pending) == 0 || cl.pending[len(cl.pending)-1].End <= textStart) {
		cl.pending = append(cl.pending, Token{Type: TokenString, Start: textStart, End: cl.pos})
	}
	if len(cl.pending) == 0 {
		return Token{Type: TokenString, Start: start, End: cl.pos}
	}
	t := cl.pending[0]
	cl.pending = cl.pending[1:]
	return t
}

func (cl *CodeLexer) scanTemplateExpressionEnd(start int) int {
	length := len(cl.code)
	depth := 1
	i := start

	for i < length {
		ch := cl.code[i]

		if ch == '"' || ch == '\'' || ch == '`' {
			i = cl.skipStringInTemplate(i, ch)
			continue
		}

		if ch == '/' && i+1 < length {
			next := cl.code[i+1]
			if next == '/' {
				i = cl.skipSingleLineCommentInTemplate(i)
				continue
			}
			if next == '*' {
				i = cl.skipMultiLineCommentInTemplate(i)
				continue
			}
		}

		if ch == '{' {
			depth++
		} else if ch == '}' {
			depth--
			if depth == 0 {
				return i + 1
			}
		}

		i++
	}

	return length
}

func (cl *CodeLexer) skipStringInTemplate(start int, quote byte) int {
	i := start + 1
	length := len(cl.code)

	for i < length {
		ch := cl.code[i]
		if ch == '\\' && i+1 < length {
			i += 2
			continue
		}
		if ch == quote {
			return i + 1
		}
		i++
	}
	return length
}

func (cl *CodeLexer) skipSingleLineCommentInTemplate(start int) int {
	i := start + 2
	length := len(cl.code)
	for i < length && cl.code[i] != '\n' {
		i++
	}
	return i
}

func (cl *CodeLexer) skipMultiLineCommentInTemplate(start int) int {
	i := start + 2
	length := len(cl.code)

	for i < length {
		if cl.code[i] == '*' && i+1 < length && cl.code[i+1] == '/' {
			return i + 2
		}
		i++
	}
	return length
}

// Reset 重置词法分析器到起始位置
// 用于重复扫描同一段代码
func (cl *CodeLexer) Reset() {
	cl.pos = 0
	cl.pending = nil
}

// GetCode 获取源代码
func (cl *CodeLexer) GetCode() []byte {
	return cl.code
}

// GetCodeString 获取源代码字符串
func (cl *CodeLexer) GetCodeString() string {
	return string(cl.code)
}
