package dict

import (
	"sync"
)

// 使用延迟加载和 sync.Once 确保字典只初始化一次
var (
	charDictOnce    sync.Once
	phrasesDictOnce sync.Once
)

// LazyCharDict 延迟加载的字典包装器
type LazyCharDict struct {
	data map[rune][]string
	mu   sync.RWMutex
}

// LazyPhrasesDict 延迟加载的词组字典包装器
type LazyPhrasesDict struct {
	data map[string][][]string
	mu   sync.RWMutex
}

var (
	lazyCharDict    *LazyCharDict
	lazyPhrasesDict *LazyPhrasesDict
)

func init() {
	lazyCharDict = &LazyCharDict{}
	lazyPhrasesDict = &LazyPhrasesDict{}
}

// GetPinyinLazy 延迟加载版本的 GetPinyin
func GetPinyinLazy(char rune) ([]string, bool) {
	// 🔥 先确保全局字典已经初始化
	Init()

	// 确保本地缓存已加载
	charDictOnce.Do(func() {
		lazyCharDict.mu.Lock()
		defer lazyCharDict.mu.Unlock()
		lazyCharDict.data = CharDict
	})

	lazyCharDict.mu.RLock()
	defer lazyCharDict.mu.RUnlock()

	pinyins, exists := lazyCharDict.data[char]
	return pinyins, exists
}

// GetPhrasePinyinLazy 延迟加载版本的 GetPhrasePinyin
func GetPhrasePinyinLazy(phrase string) ([][]string, bool) {
	// 🔥 先确保全局字典已经初始化
	Init()

	// 确保本地缓存已加载
	phrasesDictOnce.Do(func() {
		lazyPhrasesDict.mu.Lock()
		defer lazyPhrasesDict.mu.Unlock()
		lazyPhrasesDict.data = PhrasesDict
	})

	lazyPhrasesDict.mu.RLock()
	defer lazyPhrasesDict.mu.RUnlock()

	pinyins, exists := lazyPhrasesDict.data[phrase]
	return pinyins, exists
}
