package main

import (
	"fmt"
	"strings"
)

// extractKeysWithDotInterruption 当 decodeDotInKeys=true 时提取键和子键
// 点号会中断方括号的匹配
// 例如：a[b.c] -> parent="a[b", matches=[".c"]
//       a[b.c.d] -> parent="a[b", matches=[".c", ".d"]
func extractKeysWithDotInterruption(key string) (string, []string) {
	// 查找第一个左方括号
	bracketStart := strings.Index(key, "[")
	if bracketStart == -1 {
		// 没有方括号，整个键就是parent
		// 但可能有点号分隔
		if strings.Contains(key, ".") {
			parts := strings.Split(key, ".")
			parent := parts[0]
			matches := make([]string, 0)
			for i := 1; i < len(parts); i++ {
				matches = append(matches, "["+parts[i]+"]")
			}
			return parent, matches
		}
		return key, []string{}
	}
	
	// 有方括号，需要处理方括号内的点号
	parent := key[:bracketStart]
	rest := key[bracketStart:] // [b.c] 或 [b.c][d]
	
	matches := make([]string, 0)
	i := 0
	for i < len(rest) {
		if rest[i] == '[' {
			// 查找对应的右方括号或点号（先到者优先）
			j := i + 1
			for j < len(rest) && rest[j] != ']' && rest[j] != '.' {
				j++
			}
			
			if j < len(rest) {
				if rest[j] == '.' {
					// 遇到点号，方括号没有闭合
					// parent 需要包含不完整的方括号
					parent = parent + rest[i:j]
					// 剩余的部分从点号开始，转换为嵌套键
					dotRest := rest[j:]
					if strings.HasPrefix(dotRest, ".") {
						// 分割点号后的部分
						dotParts := strings.Split(dotRest[1:], ".")
						for _, part := range dotParts {
							if part != "" {
								// 移除可能的右方括号
								part = strings.TrimSuffix(part, "]")
								matches = append(matches, "["+part+"]")
							}
						}
					}
					break
				} else {
					// 找到右方括号，这是一个完整的段
					matches = append(matches, rest[i:j+1])
					i = j + 1
				}
			} else {
				// 没有找到右方括号或点号，剩余部分都是parent
				parent = parent + rest[i:]
				break
			}
		} else {
			i++
		}
	}
	
	return parent, matches
}

func main() {
	tests := []struct{
		input string
		expectParent string
		expectMatches []string
	}{
		{"a[b.c]", "a[b", []string{"[c]"}},
		{"a[b]", "a", []string{"[b]"}},
		{"a.b.c", "a", []string{"[b]", "[c]"}},
		{"a[b.c.d]", "a[b", []string{"[c]", "[d]"}},
	}
	
	for _, test := range tests {
		parent, matches := extractKeysWithDotInterruption(test.input)
		fmt.Printf("Input: %s\n", test.input)
		fmt.Printf("  Expected: parent=%q, matches=%v\n", test.expectParent, test.expectMatches)
		fmt.Printf("  Got:      parent=%q, matches=%v\n", parent, matches)
		
		ok := parent == test.expectParent && len(matches) == len(test.expectMatches)
		if ok {
			for i := range matches {
				if matches[i] != test.expectMatches[i] {
					ok = false
					break
				}
			}
		}
		
		if ok {
			fmt.Println("  ✅ PASS")
		} else {
			fmt.Println("  ❌ FAIL")
		}
		fmt.Println()
	}
}




