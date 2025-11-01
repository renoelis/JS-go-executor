package core

// CartesianProduct 计算笛卡尔积
// 输入: [["nǐ"], ["hǎo", "hào"], ["ma"]]
// 输出: [["nǐ", "hǎo", "ma"], ["nǐ", "hào", "ma"]]
func CartesianProduct(arrays [][]string) [][]string {
	if len(arrays) == 0 {
		return [][]string{}
	}

	// 初始化:第一个数组的每个元素作为初始组合
	result := make([][]string, 0)
	for _, item := range arrays[0] {
		result = append(result, []string{item})
	}

	// 逐个处理后续数组
	for i := 1; i < len(arrays); i++ {
		newResult := make([][]string, 0)
		for _, existing := range result {
			for _, item := range arrays[i] {
				// 创建新组合:现有组合 + 新元素
				newCombination := make([]string, len(existing)+1)
				copy(newCombination, existing)
				newCombination[len(existing)] = item
				newResult = append(newResult, newCombination)
			}
		}
		result = newResult
	}

	return result
}

// Compact 是 CartesianProduct 的别名,用于兼容 API
func Compact(pinyins [][]string) [][]string {
	return CartesianProduct(pinyins)
}
