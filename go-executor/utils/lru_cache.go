package utils

import (
	"container/list"
	"hash/fnv"
	"sync"
	"sync/atomic"

	"github.com/dop251/goja"
)

// 🔥 优化：分片数量（减少锁竞争）
const shardCount = 32

// LRUCache 最近最少使用缓存（分片实现）
// 🔥 优化点5：使用分片锁减少高并发场景下的锁竞争
type LRUCache struct {
	shards    []*cacheShard
	maxSize   int
	hits      int64 // 缓存命中次数（原子操作）
	misses    int64 // 缓存未命中次数（原子操作）
	evictions int64 // 驱逐次数（原子操作）
}

// cacheShard 缓存分片
type cacheShard struct {
	cache   map[string]*list.Element
	lruList *list.List
	mutex   sync.RWMutex
	maxSize int
}

// cacheEntry LRU 缓存条目
type cacheEntry struct {
	key     string
	program *goja.Program
}

// NewLRUCache 创建新的 LRU 缓存
func NewLRUCache(maxSize int) *LRUCache {
	// 每个分片的大小
	shardSize := maxSize / shardCount
	if shardSize < 1 {
		shardSize = 1
	}

	shards := make([]*cacheShard, shardCount)
	for i := 0; i < shardCount; i++ {
		shards[i] = &cacheShard{
			cache:   make(map[string]*list.Element),
			lruList: list.New(),
			maxSize: shardSize,
		}
	}

	return &LRUCache{
		shards:  shards,
		maxSize: maxSize,
	}
}

// getShard 根据 key 获取对应的分片
func (c *LRUCache) getShard(key string) *cacheShard {
	hash := fnv.New32a()
	hash.Write([]byte(key))
	return c.shards[hash.Sum32()%uint32(shardCount)]
}

// Get 从缓存获取编译程序
// 🔥 优化：只锁定对应的分片，不是整个缓存
func (c *LRUCache) Get(key string) (*goja.Program, bool) {
	shard := c.getShard(key)
	shard.mutex.Lock()
	defer shard.mutex.Unlock()

	if element, found := shard.cache[key]; found {
		// 缓存命中，移到链表前端（最近使用）
		shard.lruList.MoveToFront(element)
		atomic.AddInt64(&c.hits, 1)
		return element.Value.(*cacheEntry).program, true
	}

	// 缓存未命中
	atomic.AddInt64(&c.misses, 1)
	return nil, false
}

// Put 将编译程序放入缓存
// 返回 true 表示发生了驱逐
// 🔥 优化：只锁定对应的分片
func (c *LRUCache) Put(key string, program *goja.Program) bool {
	shard := c.getShard(key)
	shard.mutex.Lock()
	defer shard.mutex.Unlock()

	// 如果已存在，更新并移到前端
	if element, found := shard.cache[key]; found {
		shard.lruList.MoveToFront(element)
		element.Value.(*cacheEntry).program = program
		return false
	}

	// 新增条目
	entry := &cacheEntry{
		key:     key,
		program: program,
	}
	element := shard.lruList.PushFront(entry)
	shard.cache[key] = element

	// 检查是否超过分片容量
	evicted := false
	if shard.lruList.Len() > shard.maxSize {
		// 驱逐最久未使用的条目（链表尾部）
		evictOldest(shard)
		atomic.AddInt64(&c.evictions, 1)
		evicted = true
	}

	return evicted
}

// evictOldest 驱逐最久未使用的条目
func evictOldest(shard *cacheShard) {
	element := shard.lruList.Back()
	if element != nil {
		shard.lruList.Remove(element)
		entry := element.Value.(*cacheEntry)
		delete(shard.cache, entry.key)
	}
}

// Len 返回当前缓存大小
func (c *LRUCache) Len() int {
	total := 0
	for _, shard := range c.shards {
		shard.mutex.RLock()
		total += shard.lruList.Len()
		shard.mutex.RUnlock()
	}
	return total
}

// Clear 清空缓存
func (c *LRUCache) Clear() {
	for _, shard := range c.shards {
		shard.mutex.Lock()
		shard.cache = make(map[string]*list.Element)
		shard.lruList = list.New()
		shard.mutex.Unlock()
	}
}

// Stats 返回缓存统计信息
func (c *LRUCache) Stats() map[string]interface{} {
	hits := atomic.LoadInt64(&c.hits)
	misses := atomic.LoadInt64(&c.misses)
	evictions := atomic.LoadInt64(&c.evictions)

	total := hits + misses
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(hits) / float64(total) * 100
	}

	return map[string]interface{}{
		"size":        c.Len(),
		"maxSize":     c.maxSize,
		"shards":      shardCount,
		"hits":        hits,
		"misses":      misses,
		"evictions":   evictions,
		"hitRate":     hitRate,
		"totalAccess": total,
	}
}
