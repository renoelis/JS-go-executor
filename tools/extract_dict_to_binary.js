#!/usr/bin/env node
/**
 * 从 pinyin.min.js 提取字典并直接生成二进制 JSON 文件
 * 避免通过 Go 代码加载大字典
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 文件路径
const INPUT_FILE = path.join(__dirname, '../assets/external-libs/pinyin.min.js');
const OUTPUT_DIR = path.join(__dirname, '../enhance_modules/pinyin/dict');

console.log('🔨 生成字典二进制文件...\n');

// 读取源文件
console.log('📖 读取 pinyin.min.js...');
const content = fs.readFileSync(INPUT_FILE, 'utf-8');

// ============================================================================
// 1. 提取汉字字典
// ============================================================================
console.log('📖 提取汉字字典 (41,244 字)...');
const charDict = {};
const dictRegex = /dict\[0x([0-9A-Fa-f]+)\]\s*=\s*"([^"]+)";/g;

let match;
let count = 0;
while ((match = dictRegex.exec(content)) !== null) {
    const unicode = parseInt(match[1], 16);
    const pinyins = match[2].split(',').map(p => p.trim());
    charDict[unicode] = pinyins;
    count++;
}

console.log(`  ✓ 提取了 ${count} 个汉字`);

// ============================================================================
// 2. 提取词组字典
// ============================================================================
console.log('📚 提取词组字典 (41,140 词)...');
const phrasesDict = {};
const phrasesRegex = /"([^"]+)":\s*\[\s*(\[.*?\])\s*\]/g;
const phrasesSection = content.match(/const phrases_dict = \{[\s\S]*?\n  \};/);

if (phrasesSection) {
    let phrasesMatch;
    let phrasesCount = 0;
    
    while ((phrasesMatch = phrasesRegex.exec(phrasesSection[0])) !== null) {
        const phrase = phrasesMatch[1];
        const pinyinsStr = phrasesMatch[2];
        
        try {
            const pinyins = JSON.parse(`[${pinyinsStr}]`);
            phrasesDict[phrase] = pinyins;
            phrasesCount++;
        } catch (e) {
            // 忽略解析错误
        }
    }
    
    console.log(`  ✓ 提取了 ${phrasesCount} 个词组`);
}

// ============================================================================
// 3. 提取专有名词字典 (pangu, panguExtend1, panguExtend2, names, wildcard)
// ============================================================================
console.log('📚 提取专有名词字典...');

// 用于合并所有专有名词
const specialDict = {};

// 提取 pangu, panguExtend1, panguExtend2, names, wildcard
const specialDictNames = ['pangu', 'panguExtend1', 'panguExtend2', 'names', 'wildcard'];
let totalSpecialWords = 0;

for (const dictName of specialDictNames) {
    const regex = new RegExp(`var ${dictName} = "([^"]+)";`, 's');
    const match = content.match(regex);
    
    if (match) {
        const data = match[1];
        const lines = data.split('\\n');
        let count = 0;
        
        for (const line of lines) {
            if (line.trim() && line.includes('|')) {
                const parts = line.split('|');
                if (parts.length >= 3) {
                    const word = parts[0].trim();
                    const flag = parts[1].trim();
                    const weight = parts[2].trim();
                    
                    if (word) {
                        // 保存为对象,包含 flag 和 weight
                        specialDict[word] = {
                            flag: flag,
                            weight: parseInt(weight) || 0
                        };
                        count++;
                        totalSpecialWords++;
                    }
                }
            }
        }
        
        console.log(`  ✓ ${dictName}: ${count} 个词条`);
    } else {
        console.log(`  ⚠️  未找到 ${dictName}`);
    }
}

console.log(`  总计: ${totalSpecialWords} 个专有名词`);

// ============================================================================
// 4. 提取同义词字典 (synonym)
// ============================================================================
console.log('📚 提取同义词字典...');
const synonymDict = [];
const synonymMatch = content.match(/var synonym = "([^"]+)";/);

if (synonymMatch) {
    const synonymData = synonymMatch[1];
    const lines = synonymData.split('\\n');
    for (const line of lines) {
        if (line.trim() && line.includes(',')) {
            const words = line.split(',').map(w => w.trim()).filter(w => w);
            if (words.length >= 2) {
                synonymDict.push(words);
            }
        }
    }
    console.log(`  ✓ 提取了 ${synonymDict.length} 组同义词`);
} else {
    console.log('  ⚠️  未找到 synonym');
}

// ============================================================================
// 5. 提取停用词字典 (stopword)
// ============================================================================
console.log('📚 提取停用词字典...');
const stopwordDict = [];

// 使用正则提取完整的stopword变量(处理多行字符串)
const stopwordRegex = /var stopword = "((?:[^"\\]|\\.)*)";/s;
const stopwordMatch = content.match(stopwordRegex);

if (stopwordMatch) {
    const stopwordData = stopwordMatch[1];
    // 处理转义的 \n
    const words = stopwordData.split('\\n').map(w => {
        // 处理转义字符
        return w.replace(/\\\\/g, '\\').replace(/\\"/g, '"').trim();
    }).filter(w => w);
    stopwordDict.push(...words);
    console.log(`  ✓ 提取了 ${stopwordDict.length} 个停用词`);
} else {
    console.log('  ⚠️  未找到 stopword');
}

// ============================================================================
// 6. 提取颜色字典 (COLOR_WITH_RGB)
// ============================================================================
console.log('🎨 提取颜色字典...');
const colorDict = {};

// 提取 COLOR_WITH_RGB 数组
const colorRegex = /var COLOR_WITH_RGB = \[(.*?)\];/s;
const colorMatch = content.match(colorRegex);

if (colorMatch) {
    try {
        // 提取数组内容，需要处理可能的多行
        const colorArrayStr = colorMatch[1];
        // 使用正则匹配每个颜色条目: ['颜色名', '#hex', 'r,g,b']
        const colorEntryRegex = /\['([^']+)',\s*'([^']+)',\s*'([^']+)'\]/g;
        let colorEntryMatch;
        let colorCount = 0;
        
        while ((colorEntryMatch = colorEntryRegex.exec(colorArrayStr)) !== null) {
            const colorName = colorEntryMatch[1];
            const hex = colorEntryMatch[2];
            const rgb = colorEntryMatch[3];
            colorDict[colorName] = {
                hex: hex,
                rgb: rgb
            };
            colorCount++;
        }
        
        console.log(`  ✓ 提取了 ${colorCount} 个颜色`);
    } catch (e) {
        console.log(`  ⚠️  颜色字典解析失败: ${e.message}`);
    }
} else {
    console.log('  ⚠️  未找到 COLOR_WITH_RGB');
}

// ============================================================================
// 7. 提取人名识别字典
// ============================================================================
console.log('👤 提取人名识别字典...');

// 提取 FAMILY_NAME_1 (单字姓)
const familyName1Dict = [];
const familyName1Regex = /var FAMILY_NAME_1 = addOrderInfo\(\[(.*?)\],\s*1\);/s;
const familyName1Match = content.match(familyName1Regex);
if (familyName1Match) {
    const namesStr = familyName1Match[1];
    const nameRegex = /'([^']+)'/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(namesStr)) !== null) {
        familyName1Dict.push(nameMatch[1]);
    }
    console.log(`  ✓ FAMILY_NAME_1: ${familyName1Dict.length} 个单字姓`);
} else {
    console.log('  ⚠️  未找到 FAMILY_NAME_1');
}

// 提取 FAMILY_NAME_2 (复姓)
const familyName2Dict = [];
const familyName2Regex = /var FAMILY_NAME_2 = addOrderInfo\(\[(.*?)\],\s*2\);/s;
const familyName2Match = content.match(familyName2Regex);
if (familyName2Match) {
    const namesStr = familyName2Match[1];
    const nameRegex = /'([^']+)'/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(namesStr)) !== null) {
        familyName2Dict.push(nameMatch[1]);
    }
    console.log(`  ✓ FAMILY_NAME_2: ${familyName2Dict.length} 个复姓`);
} else {
    console.log('  ⚠️  未找到 FAMILY_NAME_2');
}

// 提取 DOUBLE_NAME_1 (双字名首字)
const doubleName1Dict = [];
const doubleName1Regex = /var DOUBLE_NAME_1 = addOrderInfo\(\[(.*?)\],\s*1\);/s;
const doubleName1Match = content.match(doubleName1Regex);
if (doubleName1Match) {
    const namesStr = doubleName1Match[1];
    const nameRegex = /'([^']+)'/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(namesStr)) !== null) {
        doubleName1Dict.push(nameMatch[1]);
    }
    console.log(`  ✓ DOUBLE_NAME_1: ${doubleName1Dict.length} 个双字名首字`);
} else {
    console.log('  ⚠️  未找到 DOUBLE_NAME_1');
}

// 提取 DOUBLE_NAME_2 (双字名末字)
const doubleName2Dict = [];
const doubleName2Regex = /var DOUBLE_NAME_2 = addOrderInfo\(\[(.*?)\],\s*2\);/s;
const doubleName2Match = content.match(doubleName2Regex);
if (doubleName2Match) {
    const namesStr = doubleName2Match[1];
    const nameRegex = /'([^']+)'/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(namesStr)) !== null) {
        doubleName2Dict.push(nameMatch[1]);
    }
    console.log(`  ✓ DOUBLE_NAME_2: ${doubleName2Dict.length} 个双字名末字`);
} else {
    console.log('  ⚠️  未找到 DOUBLE_NAME_2');
}

// 提取 SINGLE_NAME (单字名)
const singleNameDict = [];
const singleNameRegex = /var SINGLE_NAME = addOrderInfo\(\[(.*?)\],\s*1\);/s;
const singleNameMatch = content.match(singleNameRegex);
if (singleNameMatch) {
    const namesStr = singleNameMatch[1];
    const nameRegex = /'([^']+)'/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(namesStr)) !== null) {
        singleNameDict.push(nameMatch[1]);
    }
    console.log(`  ✓ SINGLE_NAME: ${singleNameDict.length} 个单字名`);
} else {
    console.log('  ⚠️  未找到 SINGLE_NAME');
}

// 合并所有人名识别字典为一个对象
const nameDict = {
    familyName1: familyName1Dict,
    familyName2: familyName2Dict,
    doubleName1: doubleName1Dict,
    doubleName2: doubleName2Dict,
    singleName: singleNameDict
};

// ============================================================================
// 8. 提取姓氏拼音字典 (SurnamePinyinData)
// ============================================================================
console.log('📖 提取姓氏拼音字典...');
const surnamePinyinDict = {};

// 提取 SurnamePinyinData 对象
const surnamePinyinRegex = /var SurnamePinyinData = \{([\s\S]*?)\};/;
const surnamePinyinMatch = content.match(surnamePinyinRegex);

if (surnamePinyinMatch) {
    const dataStr = surnamePinyinMatch[1];
    // 匹配 "姓": [["拼音"]]
    const entryRegex = /"([^"]+)":\s*\[\s*\["([^"]+)"\]\s*\]/g;
    let entryMatch;
    let surnameCount = 0;
    
    while ((entryMatch = entryRegex.exec(dataStr)) !== null) {
        const surname = entryMatch[1];
        const pinyin = entryMatch[2];
        surnamePinyinDict[surname] = [pinyin];
        surnameCount++;
    }
    
    console.log(`  ✓ 提取了 ${surnameCount} 个姓氏拼音`);
} else {
    console.log('  ⚠️  未找到 SurnamePinyinData');
}

// ============================================================================
// 9. 提取复姓拼音字典 (CompoundSurnamePinyinData)
// ============================================================================
console.log('📖 提取复姓拼音字典...');
const compoundSurnamePinyinDict = {};

// 提取 CompoundSurnamePinyinData 对象
const compoundSurnameRegex = /var CompoundSurnamePinyinData = \{([\s\S]*?)\};/;
const compoundSurnameMatch = content.match(compoundSurnameRegex);

if (compoundSurnameMatch) {
    const dataStr = compoundSurnameMatch[1];
    // 匹配 "复姓": [[["拼音1"]], [["拼音2"]]]
    // 例如: "万俟": [["mò"], ["qí"]]
    const entryRegex = /"([^"]+)":\s*\[\s*\["([^"]+)"\],\s*\["([^"]+)"\]\s*\]/g;
    let entryMatch;
    let compoundSurnameCount = 0;
    
    while ((entryMatch = entryRegex.exec(dataStr)) !== null) {
        const compoundSurname = entryMatch[1];
        const pinyin1 = entryMatch[2];
        const pinyin2 = entryMatch[3];
        // 存储为二维数组格式，每个字一个拼音数组
        compoundSurnamePinyinDict[compoundSurname] = [[pinyin1], [pinyin2]];
        compoundSurnameCount++;
    }
    
    console.log(`  ✓ 提取了 ${compoundSurnameCount} 个复姓拼音`);
} else {
    console.log('  ⚠️  未找到 CompoundSurnamePinyinData');
}

console.log('\n💾 保存二进制文件...');

// 保存汉字字典
const charDictJson = JSON.stringify(charDict);
const charDictGz = zlib.gzipSync(charDictJson);
const charDictFile = path.join(OUTPUT_DIR, 'char_dict.json.gz');
fs.writeFileSync(charDictFile, charDictGz);
console.log(`  ✓ char_dict.json.gz: ${formatSize(charDictGz.length)} (原始: ${formatSize(charDictJson.length)})`);

// 保存词组字典
const phrasesDictJson = JSON.stringify(phrasesDict);
const phrasesDictGz = zlib.gzipSync(phrasesDictJson);
const phrasesDictFile = path.join(OUTPUT_DIR, 'phrases_dict.json.gz');
fs.writeFileSync(phrasesDictFile, phrasesDictGz);
console.log(`  ✓ phrases_dict.json.gz: ${formatSize(phrasesDictGz.length)} (原始: ${formatSize(phrasesDictJson.length)})`);

// 保存专有名词字典
if (Object.keys(specialDict).length > 0) {
    const specialDictJson = JSON.stringify(specialDict);
    const specialDictGz = zlib.gzipSync(specialDictJson);
    const specialDictFile = path.join(OUTPUT_DIR, 'special_dict.json.gz');
    fs.writeFileSync(specialDictFile, specialDictGz);
    console.log(`  ✓ special_dict.json.gz: ${formatSize(specialDictGz.length)} (原始: ${formatSize(specialDictJson.length)})`);
}

// 保存同义词字典
if (synonymDict.length > 0) {
    const synonymDictJson = JSON.stringify(synonymDict);
    const synonymDictGz = zlib.gzipSync(synonymDictJson);
    const synonymDictFile = path.join(OUTPUT_DIR, 'synonym_dict.json.gz');
    fs.writeFileSync(synonymDictFile, synonymDictGz);
    console.log(`  ✓ synonym_dict.json.gz: ${formatSize(synonymDictGz.length)} (原始: ${formatSize(synonymDictJson.length)})`);
}

// 保存停用词字典
if (stopwordDict.length > 0) {
    const stopwordDictJson = JSON.stringify(stopwordDict);
    const stopwordDictGz = zlib.gzipSync(stopwordDictJson);
    const stopwordDictFile = path.join(OUTPUT_DIR, 'stopword_dict.json.gz');
    fs.writeFileSync(stopwordDictFile, stopwordDictGz);
    console.log(`  ✓ stopword_dict.json.gz: ${formatSize(stopwordDictGz.length)} (原始: ${formatSize(stopwordDictJson.length)})`);
}

// 保存颜色字典
if (Object.keys(colorDict).length > 0) {
    const colorDictJson = JSON.stringify(colorDict);
    const colorDictGz = zlib.gzipSync(colorDictJson);
    const colorDictFile = path.join(OUTPUT_DIR, 'color_dict.json.gz');
    fs.writeFileSync(colorDictFile, colorDictGz);
    console.log(`  ✓ color_dict.json.gz: ${formatSize(colorDictGz.length)} (原始: ${formatSize(colorDictJson.length)})`);
}

// 保存人名识别字典
if (Object.keys(nameDict).length > 0) {
    const nameDictJson = JSON.stringify(nameDict);
    const nameDictGz = zlib.gzipSync(nameDictJson);
    const nameDictFile = path.join(OUTPUT_DIR, 'name_dict.json.gz');
    fs.writeFileSync(nameDictFile, nameDictGz);
    console.log(`  ✓ name_dict.json.gz: ${formatSize(nameDictGz.length)} (原始: ${formatSize(nameDictJson.length)})`);
}

// 保存姓氏拼音字典
if (Object.keys(surnamePinyinDict).length > 0) {
    const surnamePinyinDictJson = JSON.stringify(surnamePinyinDict);
    const surnamePinyinDictGz = zlib.gzipSync(surnamePinyinDictJson);
    const surnamePinyinDictFile = path.join(OUTPUT_DIR, 'surname_pinyin_dict.json.gz');
    fs.writeFileSync(surnamePinyinDictFile, surnamePinyinDictGz);
    console.log(`  ✓ surname_pinyin_dict.json.gz: ${formatSize(surnamePinyinDictGz.length)} (原始: ${formatSize(surnamePinyinDictJson.length)})`);
}

// 保存复姓拼音字典
if (Object.keys(compoundSurnamePinyinDict).length > 0) {
    const compoundSurnamePinyinDictJson = JSON.stringify(compoundSurnamePinyinDict);
    const compoundSurnamePinyinDictGz = zlib.gzipSync(compoundSurnamePinyinDictJson);
    const compoundSurnamePinyinDictFile = path.join(OUTPUT_DIR, 'compound_surname_pinyin_dict.json.gz');
    fs.writeFileSync(compoundSurnamePinyinDictFile, compoundSurnamePinyinDictGz);
    console.log(`  ✓ compound_surname_pinyin_dict.json.gz: ${formatSize(compoundSurnamePinyinDictGz.length)} (原始: ${formatSize(compoundSurnamePinyinDictJson.length)})`);
}

// ============================================================================
// 6. 生成加载代码
// ============================================================================
console.log('\n📝 生成 Go 加载代码...');
const loaderCode = `package dict

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
	Flag   string \`json:"flag"\`   // 词性标记 (如 0x0008, 0x0080)
	Weight int    \`json:"weight"\` // 权重
}

// ColorInfo 颜色信息
type ColorInfo struct {
	Hex string \`json:"hex"\` // 十六进制颜色值 (#ffffff)
	RGB string \`json:"rgb"\` // RGB值 (255,255,255)
}

// NameDict 人名识别字典结构
type NameDict struct {
	FamilyName1 []string \`json:"familyName1"\` // 单字姓
	FamilyName2 []string \`json:"familyName2"\` // 复姓
	DoubleName1 []string \`json:"doubleName1"\` // 双字名首字
	DoubleName2 []string \`json:"doubleName2"\` // 双字名末字
	SingleName  []string \`json:"singleName"\`  // 单字名
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
)

// Init 初始化字典 (延迟加载)
func Init() {
	initOnce.Do(func() {
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
	})
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
	TotalPhrases: ${Object.keys(phrasesDict).length},
	MaxLength:    10,
}

// SpecialStats 专有名词统计
var SpecialStats = struct {
	TotalWords int
}{
	TotalWords: ${Object.keys(specialDict).length},
}
`;

const loaderFile = path.join(OUTPUT_DIR, 'dict_binary.go');
fs.writeFileSync(loaderFile, loaderCode);
console.log(`  ✓ dict_binary.go`);

console.log('\n✅ 字典二进制文件生成完成!');
console.log('\n📊 统计信息:');
console.log(`  汉字字典:       ${count} 个字符`);
console.log(`  词组字典:       ${Object.keys(phrasesDict).length} 个词组`);
console.log(`  专有名词:       ${Object.keys(specialDict).length} 个词条`);
console.log(`  同义词:         ${synonymDict.length} 组`);
console.log(`  停用词:         ${stopwordDict.length} 个`);
console.log(`  颜色字典:       ${Object.keys(colorDict).length} 个颜色`);
console.log(`  人名识别字典:   单字姓 ${familyName1Dict.length}, 复姓 ${familyName2Dict.length}, 双字名首字 ${doubleName1Dict.length}, 双字名末字 ${doubleName2Dict.length}, 单字名 ${singleNameDict.length}`);
console.log(`  姓氏拼音:       ${Object.keys(surnamePinyinDict).length} 个姓氏`);

console.log('\n📊 压缩率:');
console.log(`  汉字字典: ${((1 - charDictGz.length / charDictJson.length) * 100).toFixed(1)}%`);
console.log(`  词组字典: ${((1 - phrasesDictGz.length / phrasesDictJson.length) * 100).toFixed(1)}%`);
if (Object.keys(specialDict).length > 0) {
    const specialDictJson = JSON.stringify(specialDict);
    const specialDictGz = zlib.gzipSync(specialDictJson);
    console.log(`  专有名词: ${((1 - specialDictGz.length / specialDictJson.length) * 100).toFixed(1)}%`);
}
if (synonymDict.length > 0) {
    const synonymDictJson = JSON.stringify(synonymDict);
    const synonymDictGz = zlib.gzipSync(synonymDictJson);
    console.log(`  同义词:   ${((1 - synonymDictGz.length / synonymDictJson.length) * 100).toFixed(1)}%`);
}
if (stopwordDict.length > 0) {
    const stopwordDictJson = JSON.stringify(stopwordDict);
    const stopwordDictGz = zlib.gzipSync(stopwordDictJson);
    console.log(`  停用词:   ${((1 - stopwordDictGz.length / stopwordDictJson.length) * 100).toFixed(1)}%`);
}
if (Object.keys(colorDict).length > 0) {
    const colorDictJson = JSON.stringify(colorDict);
    const colorDictGz = zlib.gzipSync(colorDictJson);
    console.log(`  颜色字典: ${((1 - colorDictGz.length / colorDictJson.length) * 100).toFixed(1)}%`);
}
if (Object.keys(nameDict).length > 0) {
    const nameDictJson = JSON.stringify(nameDict);
    const nameDictGz = zlib.gzipSync(nameDictJson);
    console.log(`  人名字典: ${((1 - nameDictGz.length / nameDictJson.length) * 100).toFixed(1)}%`);
}
if (Object.keys(surnamePinyinDict).length > 0) {
    const surnamePinyinDictJson = JSON.stringify(surnamePinyinDict);
    const surnamePinyinDictGz = zlib.gzipSync(surnamePinyinDictJson);
    console.log(`  姓氏拼音: ${((1 - surnamePinyinDictGz.length / surnamePinyinDictJson.length) * 100).toFixed(1)}%`);
}

console.log('\n下一步:');
console.log('  1. 重命名文件以切换到二进制字典:');
console.log('     mv enhance_modules/pinyin/dict/dict_gen.go enhance_modules/pinyin/dict/dict_gen.go.bak');
console.log('     mv enhance_modules/pinyin/dict/phrases_gen.go enhance_modules/pinyin/dict/phrases_gen.go.bak');
console.log('  2. 重新编译测试 (应该非常快!):');
console.log('     go build ./...');

function formatSize(bytes) {
    if (bytes > 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    } else if (bytes > 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
}



