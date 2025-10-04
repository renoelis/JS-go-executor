# JS 执行服务用户代码规范（支持 Promise）

用户上传的 JS 代码，必须通过 **`return`** 输出最终结果。
如果 `return` 返回的是 Promise，服务会自动等待该 Promise **resolve/reject** 后再返回结果。

---

## 1. 必须有 return

* 所有代码必须有一个 `return`。
* 缺少 `return` → 报错：

  ```json
  { "error": "代码中缺少 return" }
  ```

---

## 2. 支持的返回值类型

### ✅ 允许的返回值

1. **基本类型**

   * `return 123;` → `{ "result": 123 }`
   * `return "abc";` → `{ "result": "abc" }`
   * `return true;` → `{ "result": true }`
   * `return null;` → `{ "result": null }`

2. **变量引用**

   ```js
   let a = 100;
   return a;
   ```

   输出：

   ```json
   { "result": 100 }
   ```
   
   **说明**：`return a;` 返回变量 `a` 的值。如需同时返回变量名和值，请使用对象：
   
   ```js
   let a = 100;
   return { a: a };  // 或使用 ES6 简写: { a }
   ```
   
   输出：
   
   ```json
   { "result": { "a": 100 } }
   ```

3. **对象 / 数组**

   ```js
   return { name: "Tom", age: 20 };
   return [1, 2, 3];
   ```

   输出：

   ```json
   { "result": { "name": "Tom", "age": 20 } }
   { "result": [1, 2, 3] }
   ```

4. **函数调用结果**

   ```js
   function foo() { return { x: 10 }; }
   return foo();
   ```

   输出：

   ```json
   { "result": { "x": 10 } }
   ```

5. **Promise**

   * 如果 `resolve(value)` → `{ "result": value }`
   * 如果 `reject(error)` → `{ "error": error.message }`

   **示例：**

   ```js
   function asyncTask() {
     return new Promise((resolve, reject) => {
       setTimeout(() => resolve({ ok: true }), 1000);
     });
   }

   return asyncTask();
   ```

   输出：

   ```json
   { "result": { "ok": true } }
   ```

---

### ❌ 禁止的返回值

* `return undefined;` → 报错：

  ```json
  { "error": "返回值不能是 undefined" }
  ```
* `return myFunc;`（返回函数本身） → 报错。
* `return Symbol("id");` 或 `return 10n;`（无法序列化） → 报错。


---

## 4. 错误处理

* **用户 throw 错误**：

  ```js
  throw new Error("bad");
  ```

  输出：

  ```json
  { "error": "bad" }
  ```

* **Promise reject**：

  ```js
  return Promise.reject(new Error("fail"));
  ```

  输出：

  ```json
  { "error": "fail" }
  ```

---

## 5. 输出规则总结

* `return 基本类型 / 对象 / 数组` → `{ "result": 值 }`
* `return 变量` → `{ "result": 变量的值 }`
* `return 函数调用` → 执行函数，取结果 → `{ "result": 值 }`
* `return Promise` → 等待结果

  * resolve → `{ "result": 值 }`
  * reject → `{ "error": "消息" }`
* `throw` → `{ "error": "消息" }`
* `return undefined` → `{ "error": "返回值不能是 undefined" }`
* 缺少 `return` → `{ "error": "代码中缺少 return 语句" }`

---
太好了 👍 那我帮你整理一套 **Promise 异步执行的测试示例集**，涵盖不同返回场景，你可以直接拿来做测试用例。

---

# JS 执行服务 Promise 测试示例集

## 1. 返回基本类型（Promise resolve）

```js
function testNumber() {
  return new Promise(resolve => {
    setTimeout(() => resolve(123), 500);
  });
}
return testNumber();
```

期望输出：

```json
{ "result": 123 }
```

```js
function testString() {
  return Promise.resolve("hello");
}
return testString();
```

期望输出：

```json
{ "result": "hello" }
```

---

## 2. 返回对象 / 数组

```js
function testObject() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ name: "Tom", age: 20 }), 500);
  });
}
return testObject();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

```js
function testArray() {
  return Promise.resolve([1, 2, 3]);
}
return testArray();
```

期望输出：

```json
{ "result": [1, 2, 3] }
```

---

## 3. 返回 null

```js
function testNull() {
  return Promise.resolve(null);
}
return testNull();
```

期望输出：

```json
{ "result": null }
```

---

## 4. 返回变量值（包裹 Promise）

```js
let x = 42;
function testVar() {
  return new Promise(resolve => resolve(x));
}
return testVar();
```

期望输出：

```json
{ "result": 42 }
```

**说明**：如需返回变量名和值，请使用对象：

```js
let x = 42;
function testVar() {
  return new Promise(resolve => resolve({ x: x }));  // 或 { x }
}
return testVar();
```

期望输出：

```json
{ "result": { "x": 42 } }
```

---

## 5. Promise reject（错误捕获）

```js
function testReject() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error("fail test")), 500);
  });
}
return testReject();
```

期望输出：

```json
{ "error": "fail test" }
```

```js
function testRejectString() {
  return Promise.reject("simple fail");
}
return testRejectString();
```

期望输出：

```json
{ "error": "simple fail" }
```

---

## 6. 抛出异常（同步 throw）

```js
function testThrow() {
  throw new Error("bad code");
}
return testThrow();
```

期望输出：

```json
{ "error": "bad code" }
```

---

## 7. 返回 undefined（禁止）

```js
function testUndefined() {
  return Promise.resolve(undefined);
}
return testUndefined();
```

期望输出：

```json
{ "error": "返回值不能是 undefined" }
```

---


好问题 👍
既然你用 Goja 并且允许 **Promise 返回**，那用户自然可能会在代码里写 `fetch`（只要你在 Goja runtime 里注入了一个 `fetch` polyfill 或者绑定 Go 内置 HTTP）。
我帮你整理一套 **fetch 相关的 Promise 测试用例**，覆盖常见情况。

---

# JS 执行服务 Promise + fetch 测试示例集


---

## 1. fetch 成功返回 JSON

```js
function testFetchJson() {
  return fetch("https://jsonplaceholder.typicode.com/todos/1")
    .then(response => response.json())
    .then(data => data);
}
return testFetchJson();
```

期望输出：

```json
{ "result": { "userId": 1, "id": 1, "title": "...", "completed": false } }
```

---

## 2. fetch 成功返回文本

```js
function testFetchText() {
  return fetch("https://httpbin.org/get")
    .then(response => response.text())
    .then(text => text);
}
return testFetchText();
```

期望输出：

```json
{ "result": "{ \"args\":{}, ... }" }   // 返回字符串
```

---

## 3. fetch 请求错误（404）

```js
function testFetch404() {
  return fetch("https://jsonplaceholder.typicode.com/invalid-url")
    .then(response => {
      if (!response.ok) {
        throw new Error("请求失败，状态码：" + response.status);
      }
      return response.json();
    });
}
return testFetch404();
```

期望输出：

```json
{ "error": "请求失败，状态码：404" }
```

---

## 4. fetch 网络错误

```js
function testFetchNetworkError() {
  return fetch("http://127.0.0.1:9999")  // 假设端口不可用
    .then(res => res.json())
    .catch(err => {
      return Promise.reject(new Error("网络错误: " + err.message));
    });
}
return testFetchNetworkError();
```

期望输出：

```json
{ "error": "网络错误: ..." }
```

---

## 5. fetch + POST 请求（带 body）

```js
function testFetchPost() {
  return fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tom", age: 20 })
  })
  .then(res => res.json())
  .then(data => data.json);
}
return testFetchPost();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

---

## 6. fetch + Promise.all（并发请求）

```js
function testFetchAll() {
  return Promise.all([
    fetch("https://jsonplaceholder.typicode.com/todos/1").then(r => r.json()),
    fetch("https://jsonplaceholder.typicode.com/todos/2").then(r => r.json())
  ]);
}
return testFetchAll();
```

期望输出：

```json
{ "result": [ { "id": 1, ... }, { "id": 2, ... } ] }
```

---


