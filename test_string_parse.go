package main

import (
	"fmt"
	"strconv"
)

func main() {
	str := "9.99e99"
	
	// 测试 ParseInt
	i, err := strconv.ParseInt(str, 10, 64)
	fmt.Printf("ParseInt('%s'): %d, err: %v\n", str, i, err)
	
	// 测试 ParseFloat
	f, err := strconv.ParseFloat(str, 64)
	fmt.Printf("ParseFloat('%s'): %e, err: %v\n", str, f, err)
	
	// 直接转换
	i64 := int64(f)
	fmt.Printf("int64(float): %d\n", i64)
	
	// 测试其他值
	tests := []string{"0", "5", "10", "100", "1e20", "9.99e99", "Infinity"}
	fmt.Println("\n所有测试:")
	for _, s := range tests {
		f, _ := strconv.ParseFloat(s, 64)
		i := int64(f)
		fmt.Printf("%-15s -> float: %e, int64: %d\n", s, f, i)
	}
}
