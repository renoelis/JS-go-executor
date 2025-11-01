package style

import "strings"

// ToPassport 转换为护照风格
// JavaScript 原版规则: .replace("v", "YU").toUpperCase()
// 这意味着:
//   - lü → lv → LYU (吕)
//   - nü → nv → NYU (女)
//   - lüe → lve → LYUE (略)
//   - nüe → nve → NYUE (虐)
//   - 其他 ü → YU
//   - 全大写
func ToPassport(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	// 1. 去除声调
	basePinyin := ToNormal(pinyin)

	// 2. 统一规则: 把所有 ü 和 v 替换成 yu
	result := strings.ReplaceAll(basePinyin, "ü", "yu")
	result = strings.ReplaceAll(result, "v", "yu")

	// 3. 转大写
	return strings.ToUpper(result)
}
