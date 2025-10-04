package service

import (
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// ModuleEnhancer 模块增强器接口
// 所有的模块增强器（Buffer, Crypto, Fetch 等）都应该实现这个接口
//
// 设计目标：
//   - 统一模块管理接口
//   - 支持依赖注入和控制反转
//   - 便于扩展和测试
//   - 统一资源管理和清理
type ModuleEnhancer interface {
	// Name 返回模块名称（用于日志和调试）
	Name() string

	// Register 注册模块到 require 系统
	// 例如: registry.RegisterNativeModule("crypto", ...)
	// 返回 error 如果注册失败
	Register(registry *require.Registry) error

	// Setup 在 Runtime 上设置全局对象或环境
	// 例如: runtime.Set("fetch", ...)
	// 返回 error 如果设置失败
	Setup(runtime *goja.Runtime) error

	// Close 关闭模块并释放资源
	// 🔥 Graceful Shutdown 支持
	//
	// 调用时机：
	//   - JSExecutor.Shutdown() 中通过 ModuleRegistry.CloseAll() 调用
	//   - 服务接收到 SIGTERM/SIGINT 信号时触发
	//
	// 实现要求：
	//   - 如果模块不需要清理资源，实现为返回 nil 即可
	//   - 如果模块持有需要释放的资源（如 HTTP 连接、文件句柄等），在此方法中清理
	//   - 应该是幂等的（多次调用不会出错）
	//   - 不应阻塞太久（建议 < 5 秒）
	//
	// 返回值：
	//   - error: 关闭失败时返回错误，但不应影响其他模块的关闭
	Close() error
}

// ModuleRegistry 模块注册器
// 负责管理所有的模块增强器，统一初始化和配置
//
// 职责：
//   - 集中管理所有模块
//   - 统一注册和初始化流程
//   - 提供模块查询能力
//   - 线程安全的模块管理
type ModuleRegistry struct {
	modules []ModuleEnhancer
	mu      sync.RWMutex
}

// NewModuleRegistry 创建新的模块注册器
func NewModuleRegistry() *ModuleRegistry {
	return &ModuleRegistry{
		modules: make([]ModuleEnhancer, 0, 10), // 预分配容量
	}
}

// Register 注册一个模块
// 参数：
//   - module: 实现了 ModuleEnhancer 接口的模块
//
// 线程安全，可以并发调用
func (mr *ModuleRegistry) Register(module ModuleEnhancer) {
	mr.mu.Lock()
	defer mr.mu.Unlock()

	mr.modules = append(mr.modules, module)
	utils.Debug("注册模块", zap.String("module", module.Name()))
}

// RegisterAll 将所有模块注册到 require 系统
// 参数：
//   - registry: goja_nodejs 的 require 注册表
//
// 返回：
//   - error: 如果任何模块注册失败
//
// 注意：按照注册顺序依次注册，如果有依赖关系需要注意顺序
func (mr *ModuleRegistry) RegisterAll(registry *require.Registry) error {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	utils.Debug("开始注册模块到 require 系统", zap.Int("module_count", len(mr.modules)))

	for i, module := range mr.modules {
		utils.Debug("注册模块到 require 系统", zap.Int("index", i+1), zap.Int("total", len(mr.modules)), zap.String("module", module.Name()))
		if err := module.Register(registry); err != nil {
			return fmt.Errorf("failed to register module %s: %w", module.Name(), err)
		}
	}

	utils.Info("所有模块已成功注册到 require 系统")
	return nil
}

// SetupAll 在 Runtime 上设置所有模块
// 参数：
//   - runtime: goja Runtime 实例
//
// 返回：
//   - error: 如果任何模块设置失败
//
// 注意：这个方法会在每个 Runtime 初始化时调用
func (mr *ModuleRegistry) SetupAll(runtime *goja.Runtime) error {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	for _, module := range mr.modules {
		if err := module.Setup(runtime); err != nil {
			return fmt.Errorf("failed to setup module %s: %w", module.Name(), err)
		}
	}

	return nil
}

// GetModule 根据名称获取模块（用于特殊场景）
// 参数：
//   - name: 模块名称
//
// 返回：
//   - ModuleEnhancer: 找到的模块
//   - bool: 是否找到
//
// 用途：
//   - 获取特定模块进行额外配置
//   - 测试场景中验证模块是否已注册
func (mr *ModuleRegistry) GetModule(name string) (ModuleEnhancer, bool) {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	for _, module := range mr.modules {
		if module.Name() == name {
			return module, true
		}
	}
	return nil, false
}

// Count 返回已注册的模块数量
func (mr *ModuleRegistry) Count() int {
	mr.mu.RLock()
	defer mr.mu.RUnlock()
	return len(mr.modules)
}

// List 返回所有已注册模块的名称列表
func (mr *ModuleRegistry) List() []string {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	names := make([]string, 0, len(mr.modules))
	for _, module := range mr.modules {
		names = append(names, module.Name())
	}
	return names
}

// CloseAll 关闭所有模块并释放资源
// 🔥 Graceful Shutdown 支持
//
// 调用顺序：
//   - 按照模块注册的顺序依次关闭
//   - 即使某个模块关闭失败，也会继续关闭其他模块
//
// 返回值：
//   - error: 如果有任何模块关闭失败，返回汇总的错误信息
//
// 线程安全：使用读锁，允许并发读取（但不应在关闭期间注册新模块）
func (mr *ModuleRegistry) CloseAll() error {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	utils.Info("开始关闭所有模块")

	var errors []error
	successCount := 0

	for _, module := range mr.modules {
		moduleName := module.Name()
		utils.Info("关闭模块", zap.String("module", moduleName))

		if err := module.Close(); err != nil {
			utils.Warn("模块关闭失败",
				zap.String("module", moduleName),
				zap.Error(err),
			)
			errors = append(errors, fmt.Errorf("%s: %w", moduleName, err))
		} else {
			successCount++
		}
	}

	utils.Info("模块关闭完成",
		zap.Int("total", len(mr.modules)),
		zap.Int("success", successCount),
		zap.Int("failed", len(errors)),
	)

	if len(errors) > 0 {
		return fmt.Errorf("部分模块关闭失败: %v", errors)
	}

	return nil
}

// Clear 清空所有已注册的模块（主要用于测试）
func (mr *ModuleRegistry) Clear() {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	mr.modules = make([]ModuleEnhancer, 0)
}
