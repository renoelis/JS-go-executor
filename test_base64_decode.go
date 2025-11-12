package main

import (
	"encoding/base64"
	"fmt"
)

func main() {
	str := "dGVzdA"
	fmt.Printf("测试字符串: %s\n", str)
	
	// 测试标准base64解码
	decoded, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		fmt.Printf("标准base64解码失败: %v\n", err)
	} else {
		fmt.Printf("标准base64解码成功: %v\n", decoded)
	}
	
	// 测试需要填充的情况
	padded := str
	for len(padded)%4 != 0 {
		padded += "="
	}
	fmt.Printf("加填充后: %s\n", padded)
	
	decoded2, err2 := base64.StdEncoding.DecodeString(padded)
	if err2 != nil {
		fmt.Printf("填充后base64解码失败: %v\n", err2)
	} else {
		fmt.Printf("填充后base64解码成功: %v\n", decoded2)
	}
}
