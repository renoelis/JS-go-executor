package utils

import (
	"container/list"
	"hash/fnv"
	"sync"
	"sync/atomic"
)

// 🔥 通用 LRU 缓存（用于缓存任意类型的值）
// 用途：缓存验证结果、配置等非 goja.Program 的数据

// GenericLRUCache 通用最近最少使用缓存（分片实现）
// 🔥 优化点：使用分片锁减少高并发场景下的锁竞争
type GenericLRUCache struct {
	shards    []*genericCacheShard
	maxSize   int
	hits      int64 // 缓存命中次数（原子操作）
	misses    int64 // 缓存未命中次数（原子操作）
	evictions int64 // 驱逐次数（原子操作）
}

// genericCacheShard 通用缓存分片
type genericCacheShard struct {
	cache   map[string]*list.Element
	lruList *list.List
	mutex   sync.RWMutex
	maxSize int
}

// genericCacheEntry 通用 LRU 缓存条目
type genericCacheEntry struct {
	key   string
	value interface{}
}

// NewGenericLRUCache 创建新的通用 LRU 缓存
func NewGenericLRUCache(maxSize int) *GenericLRUCache {
	// 每个分片的大小
	shardSize := maxSize / shardCount
	if shardSize < 1 {
		shardSize = 1
	}

	shards := make([]*genericCacheShard, shardCount)
	for i := 0; i < shardCount; i++ {
		shards[i] = &genericCacheShard{
			cache:   make(map[string]*list.Element),
			lruList: list.New(),
			maxSize: shardSize,
		}
	}

	return &GenericLRUCache{
		shards:  shards,
		maxSize: maxSize,
	}
}

// getShard 根据 key 获取对应的分片
func (c *GenericLRUCache) getShard(key string) *genericCacheShard {
	hash := fnv.New32a()
	hash.Write([]byte(key))
	return c.shards[hash.Sum32()%uint32(shardCount)]
}

// Get 从缓存获取值
// 🔥 优化：只锁定对应的分片，不是整个缓存
func (c *GenericLRUCache) Get(key string) (interface{}, bool) {
	shard := c.getShard(key)
	shard.mutex.Lock()
	defer shard.mutex.Unlock()

	if element, found := shard.cache[key]; found {
		// 缓存命中，移到链表前端（最近使用）
		shard.lruList.MoveToFront(element)
		atomic.AddInt64(&c.hits, 1)
		return element.Value.(*genericCacheEntry).value, true
	}

	// 缓存未命中
	atomic.AddInt64(&c.misses, 1)
	return nil, false
}

// Put 将值放入缓存
// 返回 true 表示发生了驱逐
// 🔥 优化：只锁定对应的分片
func (c *GenericLRUCache) Put(key string, value interface{}) bool {
	shard := c.getShard(key)
	shard.mutex.Lock()
	defer shard.mutex.Unlock()

	// 如果已存在，更新并移到前端
	if element, found := shard.cache[key]; found {
		shard.lruList.MoveToFront(element)
		element.Value.(*genericCacheEntry).value = value
		return false
	}

	// 新增条目
	entry := &genericCacheEntry{
		key:   key,
		value: value,
	}
	element := shard.lruList.PushFront(entry)
	shard.cache[key] = element

	// 检查是否超过分片容量
	evicted := false
	if shard.lruList.Len() > shard.maxSize {
		// 驱逐最久未使用的条目（链表尾部）
		evictOldestGeneric(shard)
		atomic.AddInt64(&c.evictions, 1)
		evicted = true
	}

	return evicted
}

// evictOldestGeneric 驱逐最久未使用的条目
func evictOldestGeneric(shard *genericCacheShard) {
	element := shard.lruList.Back()
	if element != nil {
		shard.lruList.Remove(element)
		entry := element.Value.(*genericCacheEntry)
		delete(shard.cache, entry.key)
	}
}

// Len 返回当前缓存大小
func (c *GenericLRUCache) Len() int {
	total := 0
	for _, shard := range c.shards {
		shard.mutex.RLock()
		total += shard.lruList.Len()
		shard.mutex.RUnlock()
	}
	return total
}

// Clear 清空缓存
func (c *GenericLRUCache) Clear() {
	for _, shard := range c.shards {
		shard.mutex.Lock()
		shard.cache = make(map[string]*list.Element)
		shard.lruList = list.New()
		shard.mutex.Unlock()
	}
}

// Stats 返回缓存统计信息
func (c *GenericLRUCache) Stats() map[string]interface{} {
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
