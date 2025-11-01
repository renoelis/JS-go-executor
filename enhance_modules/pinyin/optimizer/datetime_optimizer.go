package optimizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
	"unicode"
)

// DatetimeOptimizer 日期时间识别优化器
// 识别并合并日期时间相关的词组
// 与 JavaScript pinyin.js 的 DatetimeOptimizer 兼容
type DatetimeOptimizer struct {
	datetimeKeywords map[string]bool
	timeUnits        map[string]bool
}

// NewDatetimeOptimizer 创建日期时间识别优化器
func NewDatetimeOptimizer() *DatetimeOptimizer {
	// 日期时间关键词
	keywords := map[string]bool{
		"年": true, "月": true, "日": true, "号": true,
		"时": true, "分": true, "秒": true,
		"点": true, "点钟": true,
		"今天": true, "明天": true, "后天": true, "昨天": true, "前天": true,
		"今年": true, "明年": true, "后年": true, "去年": true, "前年": true,
		"今晚": true, "明晚": true, "昨晚": true,
		"早上": true, "上午": true, "中午": true, "下午": true, "晚上": true, "夜里": true, "深夜": true,
		"凌晨": true, "清晨": true, "傍晚": true, "黄昏": true,
		"春": true, "夏": true, "秋": true, "冬": true,
		"春季": true, "夏季": true, "秋季": true, "冬季": true,
		"季度": true, "周": true, "星期": true, "礼拜": true,
	}

	// 星期
	for i := 0; i <= 7; i++ {
		keywords["星期"+string(rune('0'+i))] = true
		keywords["礼拜"+string(rune('0'+i))] = true
		keywords["周"+string(rune('0'+i))] = true
	}
	keywords["星期一"] = true
	keywords["星期二"] = true
	keywords["星期三"] = true
	keywords["星期四"] = true
	keywords["星期五"] = true
	keywords["星期六"] = true
	keywords["星期日"] = true
	keywords["星期天"] = true

	// 时间单位
	units := map[string]bool{
		"年": true, "月": true, "日": true, "号": true,
		"时": true, "分": true, "秒": true,
		"点": true, "点钟": true,
		"天": true, "周": true, "季": true,
	}

	return &DatetimeOptimizer{
		datetimeKeywords: keywords,
		timeUnits:        units,
	}
}

// Optimize 实现 Optimizer 接口
func (o *DatetimeOptimizer) Optimize(words []tokenizer.Word) []tokenizer.Word {
	if len(words) < 2 {
		return words
	}

	result := make([]tokenizer.Word, 0, len(words))
	i := 0

	for i < len(words) {
		// 尝试从当前位置识别日期时间
		if datetime := o.tryMatchDatetime(words, i); datetime != nil {
			result = append(result, datetime.Word)
			i += datetime.mergedCount
		} else {
			result = append(result, words[i])
			i++
		}
	}

	return result
}

// DatetimeMatch 日期时间匹配结果
type DatetimeMatch struct {
	tokenizer.Word
	mergedCount int // 合并的词数量
}

// tryMatchDatetime 尝试从指定位置匹配日期时间
func (o *DatetimeOptimizer) tryMatchDatetime(words []tokenizer.Word, start int) *DatetimeMatch {
	if start >= len(words) {
		return nil
	}

	// 🎯 模式1: 完整日期格式 (如: 2024年10月31日)
	if match := o.matchFullDate(words, start); match != nil {
		return match
	}

	// 🎯 模式2: 时间格式 (如: 上午9点30分)
	if match := o.matchTime(words, start); match != nil {
		return match
	}

	// 🎯 模式3: 星期格式 (如: 星期五)
	if match := o.matchWeekday(words, start); match != nil {
		return match
	}

	// 🎯 模式4: 相对时间 (如: 今天, 明年)
	if match := o.matchRelativeTime(words, start); match != nil {
		return match
	}

	return nil
}

// matchFullDate 匹配完整日期 (如: 2024年10月31日)
func (o *DatetimeOptimizer) matchFullDate(words []tokenizer.Word, start int) *DatetimeMatch {
	if start >= len(words) {
		return nil
	}

	// 必须以数字开头
	if !isNumericWord(words[start].W) {
		return nil
	}

	// 向后查找日期组件
	i := start
	dateText := ""
	count := 0

	for i < len(words) {
		word := words[i]

		// 数字 或 日期单位
		if isNumericWord(word.W) || o.isDatetimeKeyword(word.W) {
			dateText += word.W
			count++
			i++

			// 如果遇到"日"或"号"，结束
			if word.W == "日" || word.W == "号" {
				break
			}
		} else {
			break
		}

		// 最多合并10个词
		if count >= 10 {
			break
		}
	}

	// 至少要有3个词 (如: 2024年10月)
	if count >= 3 && (containsString(dateText, "年") || containsString(dateText, "月") || containsString(dateText, "日")) {
		return &DatetimeMatch{
			Word: tokenizer.Word{
				W: dateText,
				P: postag.D_T, // 标记为时间词
				C: words[start].C,
			},
			mergedCount: count,
		}
	}

	return nil
}

// matchTime 匹配时间 (如: 上午9点30分)
func (o *DatetimeOptimizer) matchTime(words []tokenizer.Word, start int) *DatetimeMatch {
	if start >= len(words) {
		return nil
	}

	// 时段词 (上午/下午/晚上) 或 数字
	firstWord := words[start].W
	if !o.isTimePeriod(firstWord) && !isNumericWord(firstWord) {
		return nil
	}

	i := start
	timeText := ""
	count := 0

	for i < len(words) {
		word := words[i]

		// 数字、时间单位、时段词
		if isNumericWord(word.W) || o.isTimeUnit(word.W) || o.isTimePeriod(word.W) {
			timeText += word.W
			count++
			i++

			// 如果遇到"分"或"秒"，可能结束
			if word.W == "分" || word.W == "秒" {
				// 继续检查后面是否还有
				if i < len(words) && !isNumericWord(words[i].W) && !o.isTimeUnit(words[i].W) {
					break
				}
			}
		} else {
			break
		}

		// 最多合并8个词
		if count >= 8 {
			break
		}
	}

	// 至少要有2个词且包含时间单位
	if count >= 2 && (containsString(timeText, "点") || containsString(timeText, "时") ||
		containsString(timeText, "分") || containsString(timeText, "秒")) {
		return &DatetimeMatch{
			Word: tokenizer.Word{
				W: timeText,
				P: postag.D_T,
				C: words[start].C,
			},
			mergedCount: count,
		}
	}

	return nil
}

// matchWeekday 匹配星期 (如: 星期五)
func (o *DatetimeOptimizer) matchWeekday(words []tokenizer.Word, start int) *DatetimeMatch {
	if start >= len(words) {
		return nil
	}

	word := words[start].W

	// 完整的星期词
	if o.isWeekday(word) {
		return &DatetimeMatch{
			Word: tokenizer.Word{
				W: word,
				P: postag.D_T,
				C: words[start].C,
			},
			mergedCount: 1,
		}
	}

	// 拆分的星期词 (如: 星期 + 五)
	if start+1 < len(words) {
		combined := word + words[start+1].W
		if o.isWeekday(combined) {
			return &DatetimeMatch{
				Word: tokenizer.Word{
					W: combined,
					P: postag.D_T,
					C: words[start].C,
				},
				mergedCount: 2,
			}
		}
	}

	return nil
}

// matchRelativeTime 匹配相对时间 (如: 今天, 明年)
func (o *DatetimeOptimizer) matchRelativeTime(words []tokenizer.Word, start int) *DatetimeMatch {
	if start >= len(words) {
		return nil
	}

	word := words[start].W

	relativeWords := []string{
		"今天", "明天", "后天", "昨天", "前天",
		"今年", "明年", "后年", "去年", "前年",
		"今晚", "明晚", "昨晚",
	}

	for _, rel := range relativeWords {
		if word == rel {
			return &DatetimeMatch{
				Word: tokenizer.Word{
					W: word,
					P: postag.D_T,
					C: words[start].C,
				},
				mergedCount: 1,
			}
		}
	}

	return nil
}

// isDatetimeKeyword 检查是否为日期时间关键词
func (o *DatetimeOptimizer) isDatetimeKeyword(word string) bool {
	return o.datetimeKeywords[word]
}

// isTimeUnit 检查是否为时间单位
func (o *DatetimeOptimizer) isTimeUnit(word string) bool {
	return o.timeUnits[word]
}

// isTimePeriod 检查是否为时段词
func (o *DatetimeOptimizer) isTimePeriod(word string) bool {
	periods := []string{
		"早上", "上午", "中午", "下午", "晚上", "夜里", "深夜",
		"凌晨", "清晨", "傍晚", "黄昏",
	}

	for _, p := range periods {
		if word == p {
			return true
		}
	}
	return false
}

// isWeekday 检查是否为星期词
func (o *DatetimeOptimizer) isWeekday(word string) bool {
	weekdays := []string{
		"星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日", "星期天",
		"礼拜一", "礼拜二", "礼拜三", "礼拜四", "礼拜五", "礼拜六", "礼拜日", "礼拜天",
		"周一", "周二", "周三", "周四", "周五", "周六", "周日", "周天",
	}

	for _, w := range weekdays {
		if word == w {
			return true
		}
	}
	return false
}

// isNumericWord 检查是否为数字词
func isNumericWord(word string) bool {
	if word == "" {
		return false
	}

	// 检查是否全是数字
	allDigits := true
	for _, r := range word {
		if !unicode.IsDigit(r) {
			allDigits = false
			break
		}
	}
	if allDigits {
		return true
	}

	// 中文数字
	chineseNums := "零一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億"
	for _, r := range word {
		found := false
		for _, cn := range chineseNums {
			if r == cn {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	return true
}

// containsString 检查字符串是否包含子串
func containsString(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					indexOf(s, substr) >= 0)))
}

// indexOf 返回子串在字符串中的位置
func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

// Name 实现 Optimizer 接口
func (o *DatetimeOptimizer) Name() string {
	return "datetime"
}
