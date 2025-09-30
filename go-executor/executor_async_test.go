package main

import (
	"testing"
	"time"
)

// TestSyncExecution 测试同步代码执行
func TestSyncExecution(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	code := `
		return input.a + input.b;
	`

	input := map[string]interface{}{
		"a": 10,
		"b": 20,
	}

	startTime := time.Now()
	result, err := executor.Execute(code, input)
	elapsed := time.Since(startTime)

	if err != nil {
		t.Fatalf("同步执行失败: %v", err)
	}

	if result.Result != int64(30) && result.Result != float64(30) {
		t.Fatalf("期望结果 30，得到 %v", result.Result)
	}

	// 同步代码应该很快（< 100ms）
	if elapsed > 100*time.Millisecond {
		t.Logf("警告: 同步代码耗时 %v（较慢）", elapsed)
	} else {
		t.Logf("✓ 同步代码耗时: %v", elapsed)
	}
}

// TestAsyncPromise 测试Promise异步执行
func TestAsyncPromise(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	code := `
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({ result: 'async completed' });
			}, 100);
		});
	`

	input := map[string]interface{}{}

	startTime := time.Now()
	result, err := executor.Execute(code, input)
	elapsed := time.Since(startTime)

	if err != nil {
		t.Fatalf("Promise执行失败: %v", err)
	}

	// 检查结果
	resultMap, ok := result.Result.(map[string]interface{})
	if !ok {
		t.Fatalf("期望结果为map，得到 %T", result.Result)
	}

	if resultMap["result"] != "async completed" {
		t.Fatalf("期望结果 'async completed'，得到 %v", resultMap["result"])
	}

	// 应该大约100ms
	if elapsed < 90*time.Millisecond || elapsed > 200*time.Millisecond {
		t.Logf("警告: Promise耗时 %v（期望~100ms）", elapsed)
	} else {
		t.Logf("✓ Promise耗时: %v", elapsed)
	}
}

// TestAsyncPromiseChain 测试Promise链式调用
func TestAsyncPromiseChain(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	code := `
		let results = [];

		// 第一步
		const step1 = new Promise((resolve) => {
			setTimeout(() => {
				results.push('step1');
				resolve('step1 done');
			}, 100);
		});

		// 第二步（等待第一步）
		const step2 = step1.then((data) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					results.push('step2');
					resolve('step2 done');
				}, 100);
			});
		});

		// 第三步（等待第二步）
		step2.then((data) => {
			results.push('step3');
		});

		return results;
	`

	input := map[string]interface{}{}

	startTime := time.Now()
	result, err := executor.Execute(code, input)
	elapsed := time.Since(startTime)

	if err != nil {
		t.Fatalf("Promise链式执行失败: %v", err)
	}

	// 检查结果
	results, ok := result.Result.([]interface{})
	if !ok {
		t.Fatalf("期望结果为数组，得到 %T", result.Result)
	}

	if len(results) != 3 {
		t.Fatalf("期望3个结果，得到 %d", len(results))
	}

	// 验证执行顺序
	if results[0] != "step1" || results[1] != "step2" || results[2] != "step3" {
		t.Fatalf("执行顺序错误: %v", results)
	}

	// 应该大约200ms（100 + 100）
	if elapsed < 190*time.Millisecond || elapsed > 300*time.Millisecond {
		t.Logf("警告: Promise链耗时 %v（期望~200ms）", elapsed)
	} else {
		t.Logf("✓ Promise链耗时: %v，顺序正确", elapsed)
	}
}

// TestAsyncPromiseAll 测试Promise.all并发执行
func TestAsyncPromiseAll(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	code := `
		const api1 = new Promise((resolve) => {
			setTimeout(() => resolve({ api: 1, time: 100 }), 100);
		});

		const api2 = new Promise((resolve) => {
			setTimeout(() => resolve({ api: 2, time: 150 }), 150);
		});

		const api3 = new Promise((resolve) => {
			setTimeout(() => resolve({ api: 3, time: 80 }), 80);
		});

		return Promise.all([api1, api2, api3]);
	`

	input := map[string]interface{}{}

	startTime := time.Now()
	result, err := executor.Execute(code, input)
	elapsed := time.Since(startTime)

	if err != nil {
		t.Fatalf("Promise.all执行失败: %v", err)
	}

	// 检查结果
	results, ok := result.Result.([]interface{})
	if !ok {
		t.Fatalf("期望结果为数组，得到 %T", result.Result)
	}

	if len(results) != 3 {
		t.Fatalf("期望3个结果，得到 %d", len(results))
	}

	// 应该大约150ms（最长任务的时间），而不是 100+150+80=330ms
	if elapsed < 140*time.Millisecond || elapsed > 250*time.Millisecond {
		t.Fatalf("并发执行失败: 耗时 %v（期望~150ms，说明可能串行执行了）", elapsed)
	} else {
		t.Logf("✓ Promise.all并发执行: %v（期望~150ms）", elapsed)
	}
}

// TestAsyncAwaitDetection 测试async/await检测
func TestAsyncAwaitDetection(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	tests := []struct {
		name string
		code string
	}{
		{
			name: "async function",
			code: `async function test() { return 1; }`,
		},
		{
			name: "async arrow",
			code: `const test = async () => { return 1; }`,
		},
		{
			name: "await keyword",
			code: `await Promise.resolve(1);`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := executor.Execute(tt.code, map[string]interface{}{})
			if err == nil {
				t.Fatalf("应该检测到async/await并报错，但执行成功了")
			}

			execErr, ok := err.(*ExecutionError)
			if !ok {
				t.Fatalf("期望ExecutionError，得到 %T", err)
			}

			if execErr.Type != "SyntaxNotSupported" {
				t.Fatalf("期望错误类型 SyntaxNotSupported，得到 %s", execErr.Type)
			}

			t.Logf("✓ 正确检测到并拒绝: %s", tt.name)
		})
	}
}

// TestMixedSyncAsync 测试混合同步异步代码
func TestMixedSyncAsync(t *testing.T) {
	executor := NewJSExecutor()
	defer executor.Shutdown()

	code := `
		let result = {
			sync: input.value * 2,
			async: null
		};

		// 异步操作
		const asyncPart = new Promise((resolve) => {
			setTimeout(() => {
				resolve(input.value * 3);
			}, 100);
		});

		asyncPart.then((asyncResult) => {
			result.async = asyncResult;
		});

		return result;
	`

	input := map[string]interface{}{
		"value": 10,
	}

	startTime := time.Now()
	result, err := executor.Execute(code, input)
	elapsed := time.Since(startTime)

	if err != nil {
		t.Fatalf("混合执行失败: %v", err)
	}

	// 检查结果
	resultMap, ok := result.Result.(map[string]interface{})
	if !ok {
		t.Fatalf("期望结果为map，得到 %T", result.Result)
	}

	// 同步部分应该立即计算
	syncVal := resultMap["sync"]
	if syncVal != int64(20) && syncVal != float64(20) {
		t.Fatalf("同步部分错误: 期望 20，得到 %v", syncVal)
	}

	// 异步部分应该在100ms后更新
	asyncVal := resultMap["async"]
	if asyncVal != int64(30) && asyncVal != float64(30) {
		t.Fatalf("异步部分错误: 期望 30，得到 %v", asyncVal)
	}

	// 应该大约100ms
	if elapsed < 90*time.Millisecond || elapsed > 200*time.Millisecond {
		t.Logf("警告: 混合代码耗时 %v", elapsed)
	} else {
		t.Logf("✓ 混合代码耗时: %v", elapsed)
	}
}