package pinyin

// ==========================================
// 🔥 GSE 分词器已被移除（节省 ~170MB 内存）
// 现在默认使用轻量级分词器（segmenter_lite.go）
// ==========================================
//
// 如果需要恢复 GSE 高级分词功能，请：
// 1. 取消下面代码的注释
// 2. 在 go.mod 中添加: github.com/go-ego/gse v0.80.3
// 3. 运行: go mod tidy
// 4. 设置: SetUseLightweightSegmenter(false)
//
// ==========================================

/*
import (
	"sync"

	"github.com/go-ego/gse"
)

// ChineseSegmenter 中文分词器（基于 gse - 纯 Go 实现）
// 为 pinyin 模块提供专业的中文分词支持
type ChineseSegmenter struct {
	seg gse.Segmenter
	mu  sync.Mutex
}

var (
	globalSegmenter     *ChineseSegmenter
	globalSegmenterOnce sync.Once
)

// GetGlobalSegmenter 获取全局分词器单例
// 使用懒加载模式，只在需要时初始化
func GetGlobalSegmenter() *ChineseSegmenter {
	globalSegmenterOnce.Do(func() {
		globalSegmenter = NewChineseSegmenter()
	})
	return globalSegmenter
}

// NewChineseSegmenter 创建中文分词器
// 使用 gse 的默认词典
func NewChineseSegmenter() *ChineseSegmenter {
	var seg gse.Segmenter

	// 尝试从 Docker 容器中的路径加载词典
	// 如果词典文件存在，则加载；否则使用内置词典
	dictPath := "/app/gse_data/dict/zh/s_1.txt"
	err := seg.LoadDict(dictPath)
	if err != nil {
		// 回退：尝试加载默认词典
		seg.LoadDict()
	}

	return &ChineseSegmenter{
		seg: seg,
	}
}

// Segment 对文本进行中文分词
// mode: "default" | "search" | "all"
//   - default: 精确模式，适合大多数场景
//   - search: 搜索引擎模式，对长词再次切分
//   - all: 全模式，把所有可能的词语都切分出来
func (s *ChineseSegmenter) Segment(text string, mode string) []string {
	if text == "" {
		return []string{}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	switch mode {
	case "search":
		// 搜索引擎模式：适合用于搜索引擎构建倒排索引的分词
		return s.seg.CutSearch(text, true)
	case "all":
		// 全模式：把句子中所有可能的词语都扫描出来
		return s.seg.CutAll(text)
	default:
		// 精确模式（默认）：试图将句子最精确地切开，适合文本分析
		return s.seg.Cut(text, true)
	}
}

// AddWord 添加自定义词到词典
// word: 词语
// freq: 词频（可选，传 0 使用默认值）
func (s *ChineseSegmenter) AddWord(word string, freq int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if freq > 0 {
		s.seg.AddToken(word, float64(freq), "")
	} else {
		s.seg.AddToken(word, 1000.0, "") // 默认词频
	}
}

// SegmentForPinyin 专门为拼音转换优化的分词
// 返回词组列表，保留标点符号和空格
func (s *ChineseSegmenter) SegmentForPinyin(text string) []string {
	if text == "" {
		return []string{}
	}

	// 使用精确模式，适合拼音转换
	words := s.Segment(text, "default")

	// gse 分词器保留原始分词结果
	// 对于拼音转换，我们需要保持原文的完整性
	return words
}
*/
