package main

import (
	"errors"
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// 初始化 zap logger
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	logger, _ := config.Build()
	defer logger.Sync()

	// 模拟错误链
	errBase := errors.New("database connection failed")
	errWrapped := fmt.Errorf("failed to initialize: %w", errBase)
	errDoubleWrapped := fmt.Errorf("service startup failed: %w", errWrapped)

	fmt.Println("==========================================")
	fmt.Println("测试 1: 直接传递错误给 zap.Error()")
	fmt.Println("==========================================")
	logger.Error("测试直接传递", zap.Error(errDoubleWrapped))
	fmt.Printf("错误内容: %v\n", errDoubleWrapped)
	fmt.Printf("错误链: %+v\n\n", errDoubleWrapped)

	fmt.Println("==========================================")
	fmt.Println("测试 2: 再次用 fmt.Errorf 包装后传递")
	fmt.Println("==========================================")
	logger.Error("测试二次包装", zap.Error(fmt.Errorf("warmupModules failed: %w", errDoubleWrapped)))
	fmt.Printf("错误内容: %v\n", fmt.Errorf("warmupModules failed: %w", errDoubleWrapped))
	fmt.Printf("错误链: %+v\n\n", fmt.Errorf("warmupModules failed: %w", errDoubleWrapped))

	fmt.Println("==========================================")
	fmt.Println("测试 3: 使用 errors.Unwrap 检查链")
	fmt.Println("==========================================")
	err := errDoubleWrapped
	level := 0
	for err != nil {
		fmt.Printf("Level %d: %v\n", level, err)
		err = errors.Unwrap(err)
		level++
	}

	fmt.Println("\n==========================================")
	fmt.Println("测试 4: 再次包装后检查链")
	fmt.Println("==========================================")
	wrapped := fmt.Errorf("warmupModules failed: %w", errDoubleWrapped)
	err = wrapped
	level = 0
	for err != nil {
		fmt.Printf("Level %d: %v\n", level, err)
		err = errors.Unwrap(err)
		level++
	}

	fmt.Println("\n==========================================")
	fmt.Println("结论")
	fmt.Println("==========================================")
	fmt.Println("zap.Error() 本身会调用 err.Error() 获取完整错误信息")
	fmt.Println("- 如果错误已经用 %w 包装，所有层级都会显示在 Error() 中")
	fmt.Println("- 再次用 fmt.Errorf 包装只是添加了一个额外的上下文层")
	fmt.Println("- 是否需要额外包装取决于：当前上下文是否已经足够明确")

	os.Exit(0)
}
