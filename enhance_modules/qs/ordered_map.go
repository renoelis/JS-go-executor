package qs

// ============================================================================
// OrderedMap - 有序映射（保持插入顺序）
// 用于确保与 Node.js qs 的键顺序完全一致
// ============================================================================

// OrderedMap 有序映射，保持键的插入顺序
type OrderedMap struct {
	keys   []string
	values map[string]interface{}
}

// NewOrderedMap 创建新的有序映射
func NewOrderedMap() *OrderedMap {
	return &OrderedMap{
		keys:   make([]string, 0),
		values: make(map[string]interface{}),
	}
}

// Set 设置键值对
func (om *OrderedMap) Set(key string, value interface{}) {
	// 如果键不存在，添加到 keys 数组
	if _, exists := om.values[key]; !exists {
		om.keys = append(om.keys, key)
	}
	om.values[key] = value
}

// Get 获取值
func (om *OrderedMap) Get(key string) (interface{}, bool) {
	val, exists := om.values[key]
	return val, exists
}

// Has 检查键是否存在
func (om *OrderedMap) Has(key string) bool {
	_, exists := om.values[key]
	return exists
}

// Delete 删除键
func (om *OrderedMap) Delete(key string) {
	if _, exists := om.values[key]; exists {
		delete(om.values, key)
		// 从 keys 中移除
		for i, k := range om.keys {
			if k == key {
				om.keys = append(om.keys[:i], om.keys[i+1:]...)
				break
			}
		}
	}
}

// Keys 获取所有键（按插入顺序）
func (om *OrderedMap) Keys() []string {
	return om.keys
}

// Values 获取所有值（按键的插入顺序）
func (om *OrderedMap) Values() []interface{} {
	result := make([]interface{}, len(om.keys))
	for i, key := range om.keys {
		result[i] = om.values[key]
	}
	return result
}

// Len 获取长度
func (om *OrderedMap) Len() int {
	return len(om.keys)
}

// ToMap 转换为普通 map
func (om *OrderedMap) ToMap() map[string]interface{} {
	return om.values
}

// Range 遍历所有键值对（按插入顺序）
func (om *OrderedMap) Range(fn func(key string, value interface{}) bool) {
	for _, key := range om.keys {
		if !fn(key, om.values[key]) {
			break
		}
	}
}
