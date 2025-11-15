package main

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

// 原始方法：字符串拼接（O(n²)）
func decodeHexLenientOld(str string) string {
	validStr := ""
	for i := 0; i < len(str); i++ {
		c := str[i]
		if isValidHexChar(c) {
			validStr += string(c)
		} else {
			break
		}
	}
	return validStr
}

// 优化方法：使用 strings.Builder（O(n)）
func decodeHexLenientNew(str string) string {
	var validStr strings.Builder
	validStr.Grow(len(str))
	for i := 0; i < len(str); i++ {
		c := str[i]
		if isValidHexChar(c) {
			validStr.WriteByte(c)
		} else {
			break
		}
	}
	return validStr.String()
}

func isValidHexChar(c byte) bool {
	return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
}

// 性能基准测试 - 小数据（10KB）
func BenchmarkOldMethod10KB(b *testing.B) {
	testData := strings.Repeat("abcdef0123456789", 625)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		decodeHexLenientOld(testData)
	}
}

func BenchmarkNewMethod10KB(b *testing.B) {
	testData := strings.Repeat("abcdef0123456789", 625)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		decodeHexLenientNew(testData)
	}
}

// 性能基准测试 - 中等数据（100KB）
func BenchmarkOldMethod100KB(b *testing.B) {
	testData := strings.Repeat("abcdef0123456789", 6250)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		decodeHexLenientOld(testData)
	}
}

func BenchmarkNewMethod100KB(b *testing.B) {
	testData := strings.Repeat("abcdef0123456789", 6250)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		decodeHexLenientNew(testData)
	}
}

// 性能对比演示
func main() {
	fmt.Println("字符串拼接性能对比测试")
	fmt.Println(strings.Repeat("=", 60))

	testSizes := []int{1000, 10000, 100000, 1000000}

	for _, size := range testSizes {
		testData := strings.Repeat("abcdef0123456789", size/16)

		// 测试原始方法
		start := time.Now()
		result1 := decodeHexLenientOld(testData)
		oldTime := time.Since(start)

		// 测试优化方法
		start = time.Now()
		result2 := decodeHexLenientNew(testData)
		newTime := time.Since(start)

		// 验证结果一致
		if result1 != result2 {
			fmt.Printf("❌ 结果不一致！\n")
			continue
		}

		improvement := float64(oldTime) / float64(newTime)
		fmt.Printf("\n数据大小: %d 字节\n", size)
		fmt.Printf("  原始方法（字符串拼接）: %v\n", oldTime)
		fmt.Printf("  优化方法（strings.Builder）: %v\n", newTime)
		fmt.Printf("  性能提升: %.2fx\n", improvement)
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("结论：")
	fmt.Println("- 原始方法使用字符串拼接，时间复杂度为 O(n²)")
	fmt.Println("- 优化方法使用 strings.Builder，时间复杂度为 O(n)")
	fmt.Println("- 数据越大，性能提升越明显")
	fmt.Println("- 对于 100KB+ 的数据，性能提升可达 100+ 倍")
}
