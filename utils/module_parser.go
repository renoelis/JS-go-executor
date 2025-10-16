package utils

import (
	"regexp"
	"sort"
	"strings"
)

// ModuleUsageInfo 模块使用信息
type ModuleUsageInfo struct {
	HasRequire  bool     // 是否使用 require
	Modules     []string // 使用的模块列表(去重排序)
	ModuleCount int      // 模块数量
}

var (
	// 匹配 require('module') 和 require("module")
	// 支持: require('axios'), require("lodash"), require( 'uuid' )
	requirePattern = regexp.MustCompile(`require\s*\(\s*['"]([^'"]+)['"]\s*\)`)
)

// ParseModuleUsage 解析代码中使用的模块
//
// 参数:
//   - code: 用户代码(Base64解码后的JavaScript代码)
//
// 返回:
//   - *ModuleUsageInfo: 模块使用信息
//
// 功能:
//   - 提取代码中所有 require('xxx') 调用
//   - 自动去重和排序
//   - 区分基本功能(没有require)和模块使用
//
// 示例:
//   code := "const axios = require('axios');\nconst _ = require('lodash');"
//   info := ParseModuleUsage(code)
//   // info.HasRequire = true
//   // info.Modules = ["axios", "lodash"]
//   // info.ModuleCount = 2
func ParseModuleUsage(code string) *ModuleUsageInfo {
	// 查找所有 require() 调用
	matches := requirePattern.FindAllStringSubmatch(code, -1)

	if len(matches) == 0 {
		// 没有使用 require
		return &ModuleUsageInfo{
			HasRequire:  false,
			Modules:     []string{},
			ModuleCount: 0,
		}
	}

	// 提取模块名并去重
	moduleSet := make(map[string]bool)
	for _, match := range matches {
		if len(match) > 1 {
			moduleName := strings.TrimSpace(match[1])
			if moduleName != "" {
				moduleSet[moduleName] = true
			}
		}
	}

	// 转换为切片并排序(保证一致性)
	modules := make([]string, 0, len(moduleSet))
	for module := range moduleSet {
		modules = append(modules, module)
	}
	sort.Strings(modules)

	return &ModuleUsageInfo{
		HasRequire:  true,
		Modules:     modules,
		ModuleCount: len(modules),
	}
}

// GetModuleList 获取模块列表(用于JSON序列化)
// 如果没有使用模块,返回 nil 而不是空数组
func (m *ModuleUsageInfo) GetModuleList() []string {
	if !m.HasRequire || len(m.Modules) == 0 {
		return nil
	}
	return m.Modules
}

// String 返回模块使用的字符串描述
func (m *ModuleUsageInfo) String() string {
	if !m.HasRequire {
		return "基本功能(无require)"
	}
	return strings.Join(m.Modules, ", ")
}

