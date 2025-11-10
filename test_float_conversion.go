package main

import (
	"fmt"
	"math"
	"strconv"
)

func main() {
	// 测试极大浮点数的转换
	tests := []string{"9.99e99", "1e20", "1e50", "1e100", "1e308", "1e309"}
	
	for _, str := range tests {
		f, _ := strconv.ParseFloat(str, 64)
		i := int64(f)
		
		fmt.Printf("%s -> float64: %e, int64: %d, isInf: %v\n", 
			str, f, i, math.IsInf(f, 0))
			
		// 测试 floatToIntClip 的行为
		clipped := floatToIntClip(f)
		fmt.Printf("  floatToIntClip: %d\n", clipped)
	}
}

func floatToIntClip(n float64) int64 {
	switch {
	case math.IsNaN(n):
		return 0
	case math.IsInf(n, 1): // +Infinity
		return math.MaxInt64
	case math.IsInf(n, -1): // -Infinity
		return math.MinInt64
	case n >= math.MaxInt64:
		return math.MaxInt64
	case n <= math.MinInt64:
		return math.MinInt64
	}
	return int64(n)
}
