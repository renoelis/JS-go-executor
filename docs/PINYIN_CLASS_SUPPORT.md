# Pinyin 类支持文档

## 🎯 目标

添加 `Pinyin` 类支持，使 Go 实现完全兼容 npm pinyin v4 的所有导入方式。

## 📊 兼容性对比

### npm pinyin v4 支持的方式

```javascript
// 方式 1: 直接调用
const pinyin = require('pinyin');
pinyin('中国');

// 方式 2: 解构函数
const { pinyin } = require('pinyin');
pinyin('中国');

// 方式 3: 解构常量
const { STYLE_NORMAL } = require('pinyin');

// 方式 4: 解构 compact 函数
const { compact } = require('pinyin');

// 方式 5: 解构 Pinyin 类 ⭐ 新增支持
const { Pinyin } = require('pinyin');
const instance = new Pinyin();
instance.segment('我喜欢你');
```

## ✅ 实现内容

### 1. 创建 Pinyin 类

**文件**：`enhance_modules/pinyin/bridge.go`

添加 `CreatePinyinClass` 函数：

```go
// CreatePinyinClass 创建 Pinyin 类（用于 new Pinyin() 语法）
func CreatePinyinClass(runtime *goja.Runtime) goja.Value {
    // Pinyin 构造函数
    pinyinClass := func(call goja.ConstructorCall) *goja.Object {
        instance := runtime.NewObject()
        
        // 添加 segment 方法
        instance.Set("segment", func(...) {...})
        
        // 添加 pinyin 方法
        instance.Set("pinyin", func(...) {...})
        
        // 添加 compare 方法
        instance.Set("compare", func(...) {...})
        
        // 添加 compact 方法
        instance.Set("compact", func(...) {...})
        
        return instance
    }
    
    return runtime.ToValue(pinyinClass)
}
```

### 2. 导出 Pinyin 类

**文件**：`enhance_modules/pinyin_enhancement.go`

在模块注册时添加 Pinyin 类：

```go
// 🔥 添加 Pinyin 类（支持 new Pinyin() 语法）
pinyinClass := pinyin.CreatePinyinClass(runtime)
pinyinObj.Set("Pinyin", pinyinClass)
```

## 📋 Pinyin 类实例方法

### segment(text, [segmenter])

分词方法，将文本分割成词组。

```javascript
const instance = new Pinyin();
const segments = instance.segment('我喜欢你');
// 返回: ["我喜欢你"]
```

### pinyin(text, [options])

拼音转换方法，与全局 pinyin 函数行为一致。

```javascript
const instance = new Pinyin();
const result = instance.pinyin('中国');
// 返回: [["zhōng"],["guó"]]
```

### compare(a, b)

字符串拼音比较方法。

```javascript
const instance = new Pinyin();
const result = instance.compare('啊', '波');
// 返回: -1
```

### compact(pinyinArray)

多音字组合压缩方法。

```javascript
const instance = new Pinyin();
const result = pinyin('中心', { heteronym: true });
const compacted = instance.compact(result);
// 返回: [["zhōng","xīn"],["zhòng","xīn"]]
```

## 🧪 测试验证

**测试文件**：`test/pinyin/pinyin-all/test-pinyin-missing-new.js`

```javascript
const { Pinyin } = require('pinyin');

// 1. 类导入验证
console.log(typeof Pinyin === 'function'); // true

// 2. 实例创建
const instance = new Pinyin();
console.log(instance instanceof Object); // true

// 3. 方法存在性
console.log(typeof instance.segment === 'function'); // true
console.log(typeof instance.pinyin === 'function'); // true
console.log(typeof instance.compare === 'function'); // true
console.log(typeof instance.compact === 'function'); // true

// 4. 功能测试
const segments = instance.segment('我喜欢你');
console.log(segments); // ["我喜欢你"]

const pinyinResult = instance.pinyin('中国');
console.log(pinyinResult); // [["zhōng"],["guó"]]
```

## 📦 完整的导出支持

现在支持所有 npm pinyin v4 的导出方式：

```javascript
// ✅ 方式 1: 默认导出（函数）
const pinyin = require('pinyin');

// ✅ 方式 2: 解构函数
const { pinyin } = require('pinyin');

// ✅ 方式 3: 解构常量
const { STYLE_NORMAL, STYLE_TONE } = require('pinyin');

// ✅ 方式 4: 解构方法
const { compare, compact } = require('pinyin');

// ✅ 方式 5: 解构 Pinyin 类 ⭐ 新增
const { Pinyin } = require('pinyin');

// ✅ 方式 6: 混合解构
const { pinyin, Pinyin, STYLE_NORMAL, compact } = require('pinyin');
```

## 🔧 修改的文件

1. **enhance_modules/pinyin/bridge.go**
   - 添加 `CreatePinyinClass` 函数
   - 实现 Pinyin 类的构造函数和实例方法

2. **enhance_modules/pinyin_enhancement.go**
   - 在模块导出中添加 Pinyin 类
   - 更新调试日志

3. **test/pinyin/pinyin-all/test-pinyin-missing-new.js**
   - 添加 Pinyin 类的测试用例
   - 验证所有实例方法

## 🎉 兼容性

现在 Go 实现与 npm pinyin v4 **100% API 兼容**：

| 功能 | npm pinyin v4 | Go 实现 | 状态 |
|-----|---------------|---------|------|
| 默认导出函数 | ✅ | ✅ | ✅ |
| 解构导入函数 | ✅ | ✅ | ✅ |
| 解构导入常量 | ✅ | ✅ | ✅ |
| 解构导入方法 | ✅ | ✅ | ✅ |
| **Pinyin 类** | ✅ | ✅ | ⭐ 新增 |
| compare() | ✅ | ✅ | ✅ |
| compact() | ✅ | ✅ | ✅ |
| segment() | ✅ | ✅ | ✅ |
| STYLE_* 常量 | ✅ | ✅ | ✅ |
| MODE_* 常量 | ✅ | ✅ | ✅ |

## 📝 总结

通过添加 `Pinyin` 类支持，我们的 Go 实现现在完全兼容 npm pinyin v4 的所有使用方式，包括：

1. ✅ 函数调用
2. ✅ 解构导入
3. ✅ 类实例化
4. ✅ 所有实例方法

这使得用户可以无缝迁移现有的 Node.js 代码到我们的 Go 环境！🎊
