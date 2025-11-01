package dict

import (
	_ "embed"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"sync"
)

//go:embed char_dict.json.gz
var charDictData []byte

//go:embed phrases_dict.json.gz
var phrasesDictData []byte

//go:embed special_dict.json.gz
var specialDictData []byte

//go:embed synonym_dict.json.gz
var synonymDictData []byte

//go:embed stopword_dict.json.gz
var stopwordDictData []byte

//go:embed color_dict.json.gz
var colorDictData []byte

//go:embed name_dict.json.gz
var nameDictData []byte

//go:embed surname_pinyin_dict.json.gz
var surnamePinyinDictData []byte

//go:embed compound_surname_pinyin_dict.json.gz
var compoundSurnamePinyinDictData []byte

// SpecialWord 专有名词结构
type SpecialWord struct {
	Flag   string `json:"flag"`   // 词性标记 (如 0x0008, 0x0080)
	Weight int    `json:"weight"` // 权重
}

// ColorInfo 颜色信息
type ColorInfo struct {
	Hex string `json:"hex"` // 十六进制颜色值 (#ffffff)
	RGB string `json:"rgb"` // RGB值 (255,255,255)
}

// NameDict 人名识别字典结构
type NameDict struct {
	FamilyName1 []string `json:"familyName1"` // 单字姓
	FamilyName2 []string `json:"familyName2"` // 复姓
	DoubleName1 []string `json:"doubleName1"` // 双字名首字
	DoubleName2 []string `json:"doubleName2"` // 双字名末字
	SingleName  []string `json:"singleName"`  // 单字名
}

var (
	CharDict         map[rune][]string
	PhrasesDict      map[string][][]string
	SpecialDict      map[string]SpecialWord      // 专有名词字典 (人名、地名、品牌等)
	SynonymDict      [][]string                  // 同义词组列表
	StopwordDict     []string                     // 停用词列表
	ColorDict              map[string]ColorInfo         // 颜色字典
	nameDict               NameDict                     // 人名识别字典
	SurnamePinyinDict      map[string][]string         // 姓氏拼音字典
	CompoundSurnamePinyinDict map[string][][]string    // 复姓拼音字典
	
	initOnce sync.Once
	isWarmedUp bool  // 标记字典是否已预热
)

// Init 初始化字典 (延迟加载)
func Init() {
	initOnce.Do(func() {
		loadAllDicts()
	})
}

// loadAllDicts 加载所有字典（内部函数）
func loadAllDicts() {
	// 解压并加载汉字字典
	CharDict = loadCharDict()
	
	// 解压并加载词组字典
	PhrasesDict = loadPhrasesDict()
	
	// 加载专有名词字典
	SpecialDict = loadSpecialDict()
	
	// 加载同义词字典
	SynonymDict = loadSynonymDict()
	
	// 加载停用词字典
	StopwordDict = loadStopwordDict()
	
	// 加载颜色字典
	ColorDict = loadColorDict()
	
	// 加载人名识别字典
	nameDict = loadNameDict()
	
	// 加载姓氏拼音字典
	SurnamePinyinDict = loadSurnamePinyinDict()
	
	// 加载复姓拼音字典
	CompoundSurnamePinyinDict = loadCompoundSurnamePinyinDict()
	
	isWarmedUp = true
}

// WarmUp 预热字典（在服务启动时调用）
// 在后台异步加载所有字典，避免首次调用时的延迟
func WarmUp() {
	go func() {
		Init()
	}()
}

// IsWarmedUp 检查字典是否已预热完成
func IsWarmedUp() bool {
	return isWarmedUp
}

func loadCharDict() map[rune][]string {
	reader, err := gzip.NewReader(bytes.NewReader(charDictData))
	if err != nil {
		panic("Failed to decompress char dict: " + err.Error())
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		panic("Failed to read char dict: " + err.Error())
	}
	
	// JSON 的 key 是字符串，需要转换
	var tempDict map[string][]string
	if err := json.Unmarshal(data, &tempDict); err != nil {
		panic("Failed to unmarshal char dict: " + err.Error())
	}
	
	// 转换 key 为 rune
	result := make(map[rune][]string, len(tempDict))
	for key, value := range tempDict {
		// key 是数字字符串，需要转换为 rune
		var unicode int
		fmt.Sscanf(key, "%d", &unicode)
		result[rune(unicode)] = value
	}
	
	return result
}

func loadPhrasesDict() map[string][][]string {
	reader, err := gzip.NewReader(bytes.NewReader(phrasesDictData))
	if err != nil {
		panic("Failed to decompress phrases dict: " + err.Error())
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		panic("Failed to read phrases dict: " + err.Error())
	}
	
	var result map[string][][]string
	if err := json.Unmarshal(data, &result); err != nil {
		panic("Failed to unmarshal phrases dict: " + err.Error())
	}
	
	return result
}

func loadSpecialDict() map[string]SpecialWord {
	reader, err := gzip.NewReader(bytes.NewReader(specialDictData))
	if err != nil {
		// 如果加载失败,返回空字典
		return make(map[string]SpecialWord)
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return make(map[string]SpecialWord)
	}
	
	var result map[string]SpecialWord
	if err := json.Unmarshal(data, &result); err != nil {
		return make(map[string]SpecialWord)
	}
	
	return result
}

// GetPinyin 获取单个汉字的拼音
func GetPinyin(char rune) ([]string, bool) {
	Init()
	pinyins, exists := CharDict[char]
	return pinyins, exists
}

// GetNameDict 获取人名识别字典
func GetNameDict() NameDict {
	Init()
	return nameDict
}

// HasChar 检查字符是否在字典中
func HasChar(char rune) bool {
	Init()
	_, exists := CharDict[char]
	return exists
}

// IsMultiPronounced 检查是否是多音字
func IsMultiPronounced(char rune) bool {
	Init()
	pinyins, exists := CharDict[char]
	return exists && len(pinyins) > 1
}

// GetPhrasePinyin 获取词组的拼音
func GetPhrasePinyin(phrase string) ([][]string, bool) {
	Init()
	pinyins, exists := PhrasesDict[phrase]
	return pinyins, exists
}

// HasPhrase 检查词组是否在字典中
func HasPhrase(phrase string) bool {
	Init()
	_, exists := PhrasesDict[phrase]
	return exists
}

// loadSynonymDict 加载同义词字典
func loadSynonymDict() [][]string {
	reader, err := gzip.NewReader(bytes.NewReader(synonymDictData))
	if err != nil {
		// 如果加载失败,返回空列表
		return [][]string{}
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return [][]string{}
	}
	
	var result [][]string
	if err := json.Unmarshal(data, &result); err != nil {
		return [][]string{}
	}
	
	return result
}

// loadStopwordDict 加载停用词字典
func loadStopwordDict() []string {
	reader, err := gzip.NewReader(bytes.NewReader(stopwordDictData))
	if err != nil {
		// 如果加载失败,返回空列表
		return []string{}
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return []string{}
	}
	
	var result []string
	if err := json.Unmarshal(data, &result); err != nil {
		return []string{}
	}
	
	return result
}

// GetSynonyms 获取词语的同义词
func GetSynonyms(word string) []string {
	Init()
	for _, group := range SynonymDict {
		for _, w := range group {
			if w == word {
				// 返回该组的其他同义词
				result := make([]string, 0, len(group)-1)
				for _, synonym := range group {
					if synonym != word {
						result = append(result, synonym)
					}
				}
				return result
			}
		}
	}
	return nil
}

// IsStopword 检查是否为停用词
func IsStopword(word string) bool {
	Init()
	for _, sw := range StopwordDict {
		if sw == word {
			return true
		}
	}
	return false
}

// GetSpecialWord 获取专有名词信息
func GetSpecialWord(word string) (SpecialWord, bool) {
	Init()
	info, exists := SpecialDict[word]
	return info, exists
}

// IsSpecialWord 检查是否为专有名词
func IsSpecialWord(word string) bool {
	Init()
	_, exists := SpecialDict[word]
	return exists
}

// loadColorDict 加载颜色字典
func loadColorDict() map[string]ColorInfo {
	reader, err := gzip.NewReader(bytes.NewReader(colorDictData))
	if err != nil {
		return make(map[string]ColorInfo)
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return make(map[string]ColorInfo)
	}
	
	var result map[string]ColorInfo
	if err := json.Unmarshal(data, &result); err != nil {
		return make(map[string]ColorInfo)
	}
	
	return result
}

// loadNameDict 加载人名识别字典
func loadNameDict() NameDict {
	reader, err := gzip.NewReader(bytes.NewReader(nameDictData))
	if err != nil {
		return NameDict{}
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return NameDict{}
	}
	
	var result NameDict
	if err := json.Unmarshal(data, &result); err != nil {
		return NameDict{}
	}
	
	return result
}

// loadSurnamePinyinDict 加载姓氏拼音字典
func loadSurnamePinyinDict() map[string][]string {
	reader, err := gzip.NewReader(bytes.NewReader(surnamePinyinDictData))
	if err != nil {
		return make(map[string][]string)
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return make(map[string][]string)
	}
	
	var result map[string][]string
	if err := json.Unmarshal(data, &result); err != nil {
		return make(map[string][]string)
	}
	
	return result
}

// loadCompoundSurnamePinyinDict 加载复姓拼音字典
func loadCompoundSurnamePinyinDict() map[string][][]string {
	reader, err := gzip.NewReader(bytes.NewReader(compoundSurnamePinyinDictData))
	if err != nil {
		return make(map[string][][]string)
	}
	defer reader.Close()
	
	data, err := io.ReadAll(reader)
	if err != nil {
		return make(map[string][][]string)
	}
	
	var result map[string][][]string
	if err := json.Unmarshal(data, &result); err != nil {
		return make(map[string][][]string)
	}
	
	return result
}

// GetColor 获取颜色信息
func GetColor(colorName string) (ColorInfo, bool) {
	Init()
	info, exists := ColorDict[colorName]
	return info, exists
}

// GetSurnamePinyin 获取姓氏拼音
func GetSurnamePinyin(surname string) ([]string, bool) {
	Init()
	pinyins, exists := SurnamePinyinDict[surname]
	return pinyins, exists
}

// GetCompoundSurnamePinyin 获取复姓拼音
// 返回二维数组，每个字对应一个拼音数组
func GetCompoundSurnamePinyin(compoundSurname string) ([][]string, bool) {
	Init()
	pinyins, exists := CompoundSurnamePinyinDict[compoundSurname]
	return pinyins, exists
}

// IsFamilyName 检查是否为姓氏
func IsFamilyName(name string) bool {
	Init()
	// 检查单字姓
	for _, n := range nameDict.FamilyName1 {
		if n == name {
			return true
		}
	}
	// 检查复姓
	for _, n := range nameDict.FamilyName2 {
		if n == name {
			return true
		}
	}
	return false
}

// DictStats 字典统计
var DictStats = struct {
	TotalChars      int
	MultiPronounced int
	MaxPronounced   int
}{
	TotalChars:      41244,
	MultiPronounced: 5744,
	MaxPronounced:   7,
}

// PhrasesStats 词组统计
var PhrasesStats = struct {
	TotalPhrases int
	MaxLength    int
}{
	TotalPhrases: 41140,
	MaxLength:    10,
}

// SpecialStats 专有名词统计
var SpecialStats = struct {
	TotalWords int
}{
	TotalWords: 151290,
}
