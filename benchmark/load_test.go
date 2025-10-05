package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// TestRequest 测试请求结构
type TestRequest struct {
	Input      map[string]interface{} `json:"input"`
	CodeBase64 string                 `json:"codebase64"`
}

// TestResponse 测试响应结构
type TestResponse struct {
	Success   bool        `json:"success"`
	Result    interface{} `json:"result"`
	Error     *TestError  `json:"error"`
	Timing    *TestTiming `json:"timing"`
	Timestamp string      `json:"timestamp"`
}

type TestError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type TestTiming struct {
	ExecutionTime int64 `json:"executionTime"`
	TotalTime     int64 `json:"totalTime"`
}

// BenchmarkStats 压测统计
type BenchmarkStats struct {
	TotalRequests   int64
	SuccessRequests int64
	FailedRequests  int64
	TotalTime       time.Duration
	MinTime         time.Duration
	MaxTime         time.Duration
	AvgTime         time.Duration
	QPS             float64
	SuccessRate     float64
	ConcurrentLevel int
}

// LoadTester 压力测试器
type LoadTester struct {
	baseURL      string
	client       *http.Client
	stats        *BenchmarkStats
	mutex        sync.RWMutex
	requestTimes []time.Duration
}

// NewLoadTester 创建压力测试器
func NewLoadTester(baseURL string) *LoadTester {
	return &LoadTester{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        1000,
				MaxIdleConnsPerHost: 1000,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		stats:        &BenchmarkStats{},
		requestTimes: make([]time.Duration, 0, 10000),
	}
}

// RunBenchmark 运行压力测试
func (lt *LoadTester) RunBenchmark(concurrency int, totalRequests int, testCases []TestCase) {
	log.Printf("🚀 开始压力测试:")
	log.Printf("   并发数: %d", concurrency)
	log.Printf("   总请求数: %d", totalRequests)
	log.Printf("   测试用例数: %d", len(testCases))
	log.Printf("   目标URL: %s", lt.baseURL)
	log.Println()

	lt.stats.ConcurrentLevel = concurrency

	// 等待组
	var wg sync.WaitGroup

	// 请求通道
	requestChan := make(chan TestCase, totalRequests)

	// 填充请求
	for i := 0; i < totalRequests; i++ {
		testCase := testCases[i%len(testCases)]
		requestChan <- testCase
	}
	close(requestChan)

	// 开始时间
	startTime := time.Now()

	// 启动并发工作者
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			lt.worker(workerID, requestChan)
		}(i)
	}

	// 等待所有请求完成
	wg.Wait()

	// 计算统计信息
	lt.calculateStats(time.Since(startTime))

	// 打印结果
	lt.printResults()
}

// worker 工作者goroutine
func (lt *LoadTester) worker(workerID int, requestChan <-chan TestCase) {
	for testCase := range requestChan {
		startTime := time.Now()

		success := lt.sendRequest(testCase)

		requestTime := time.Since(startTime)

		// 更新统计
		lt.updateStats(success, requestTime)

		// 可选：添加小延迟避免过度压力
		// time.Sleep(1 * time.Millisecond)
	}
}

// sendRequest 发送单个请求
func (lt *LoadTester) sendRequest(testCase TestCase) bool {
	// 构造请求
	reqBody := TestRequest{
		Input:      testCase.Input,
		CodeBase64: base64.StdEncoding.EncodeToString([]byte(testCase.Code)),
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return false
	}

	// 发送HTTP请求
	resp, err := lt.client.Post(
		lt.baseURL+"/execute",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	// 解析响应
	var testResp TestResponse
	if err := json.Unmarshal(body, &testResp); err != nil {
		return false
	}

	return testResp.Success && resp.StatusCode == 200
}

// updateStats 更新统计信息
func (lt *LoadTester) updateStats(success bool, requestTime time.Duration) {
	lt.mutex.Lock()
	defer lt.mutex.Unlock()

	atomic.AddInt64(&lt.stats.TotalRequests, 1)

	if success {
		atomic.AddInt64(&lt.stats.SuccessRequests, 1)
	} else {
		atomic.AddInt64(&lt.stats.FailedRequests, 1)
	}

	// 记录请求时间
	lt.requestTimes = append(lt.requestTimes, requestTime)
}

// calculateStats 计算统计信息
func (lt *LoadTester) calculateStats(totalTime time.Duration) {
	lt.mutex.Lock()
	defer lt.mutex.Unlock()

	lt.stats.TotalTime = totalTime

	if lt.stats.TotalRequests > 0 {
		lt.stats.QPS = float64(lt.stats.TotalRequests) / totalTime.Seconds()
		lt.stats.SuccessRate = float64(lt.stats.SuccessRequests) / float64(lt.stats.TotalRequests) * 100
	}

	// 计算响应时间统计
	if len(lt.requestTimes) > 0 {
		var totalDuration time.Duration
		lt.stats.MinTime = lt.requestTimes[0]
		lt.stats.MaxTime = lt.requestTimes[0]

		for _, duration := range lt.requestTimes {
			totalDuration += duration
			if duration < lt.stats.MinTime {
				lt.stats.MinTime = duration
			}
			if duration > lt.stats.MaxTime {
				lt.stats.MaxTime = duration
			}
		}

		lt.stats.AvgTime = totalDuration / time.Duration(len(lt.requestTimes))
	}
}

// printResults 打印测试结果
func (lt *LoadTester) printResults() {
	fmt.Println("\n" + "="*60)
	fmt.Println("🎯 压力测试结果")
	fmt.Println("=" * 60)

	fmt.Printf("📊 基础统计:\n")
	fmt.Printf("   总请求数: %d\n", lt.stats.TotalRequests)
	fmt.Printf("   成功请求: %d\n", lt.stats.SuccessRequests)
	fmt.Printf("   失败请求: %d\n", lt.stats.FailedRequests)
	fmt.Printf("   成功率: %.2f%%\n", lt.stats.SuccessRate)
	fmt.Printf("   并发数: %d\n", lt.stats.ConcurrentLevel)
	fmt.Println()

	fmt.Printf("⚡ 性能指标:\n")
	fmt.Printf("   总耗时: %v\n", lt.stats.TotalTime)
	fmt.Printf("   QPS: %.2f 请求/秒\n", lt.stats.QPS)
	fmt.Printf("   平均响应时间: %v\n", lt.stats.AvgTime)
	fmt.Printf("   最小响应时间: %v\n", lt.stats.MinTime)
	fmt.Printf("   最大响应时间: %v\n", lt.stats.MaxTime)
	fmt.Println()

	// 性能评级
	lt.printPerformanceGrade()
}

// printPerformanceGrade 打印性能评级
func (lt *LoadTester) printPerformanceGrade() {
	fmt.Printf("🏆 性能评级:\n")

	// QPS评级
	var qpsGrade string
	switch {
	case lt.stats.QPS >= 1000:
		qpsGrade = "A+ (优秀)"
	case lt.stats.QPS >= 500:
		qpsGrade = "A (良好)"
	case lt.stats.QPS >= 200:
		qpsGrade = "B (中等)"
	case lt.stats.QPS >= 100:
		qpsGrade = "C (一般)"
	default:
		qpsGrade = "D (需要优化)"
	}
	fmt.Printf("   QPS评级: %s\n", qpsGrade)

	// 响应时间评级
	var latencyGrade string
	avgMs := lt.stats.AvgTime.Milliseconds()
	switch {
	case avgMs <= 10:
		latencyGrade = "A+ (优秀)"
	case avgMs <= 50:
		latencyGrade = "A (良好)"
	case avgMs <= 100:
		latencyGrade = "B (中等)"
	case avgMs <= 500:
		latencyGrade = "C (一般)"
	default:
		latencyGrade = "D (需要优化)"
	}
	fmt.Printf("   延迟评级: %s\n", latencyGrade)

	// 成功率评级
	var successGrade string
	switch {
	case lt.stats.SuccessRate >= 99.9:
		successGrade = "A+ (优秀)"
	case lt.stats.SuccessRate >= 99.0:
		successGrade = "A (良好)"
	case lt.stats.SuccessRate >= 95.0:
		successGrade = "B (中等)"
	case lt.stats.SuccessRate >= 90.0:
		successGrade = "C (一般)"
	default:
		successGrade = "D (需要优化)"
	}
	fmt.Printf("   稳定性评级: %s\n", successGrade)

	fmt.Println("=" * 60)
}

// TestCase 测试用例
type TestCase struct {
	Name  string
	Code  string
	Input map[string]interface{}
}

// 预定义测试用例
var testCases = []TestCase{
	{
		Name: "简单计算",
		Code: "return input.a + input.b;",
		Input: map[string]interface{}{
			"a": 10,
			"b": 20,
		},
	},
	{
		Name: "字符串处理",
		Code: `
			const name = input.name || "World";
			return "Hello, " + name + "!";
		`,
		Input: map[string]interface{}{
			"name": "Go+goja",
		},
	},
	{
		Name: "数组处理",
		Code: `
			const numbers = input.numbers || [];
			let sum = 0;
			for (let i = 0; i < numbers.length; i++) {
				sum += numbers[i];
			}
			return {
				count: numbers.length,
				sum: sum,
				average: numbers.length > 0 ? sum / numbers.length : 0
			};
		`,
		Input: map[string]interface{}{
			"numbers": []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10},
		},
	},
	{
		Name: "JSON处理",
		Code: `
			const data = input.data;
			const result = {
				originalKeys: Object.keys(data).length,
				processedData: {}
			};
			
			for (const key in data) {
				result.processedData[key.toUpperCase()] = data[key];
			}
			
			return result;
		`,
		Input: map[string]interface{}{
			"data": map[string]interface{}{
				"name":  "test",
				"value": 123,
				"flag":  true,
			},
		},
	},
	{
		Name: "数学计算",
		Code: `
			const x = input.x || 0;
			const y = input.y || 0;
			
			return {
				sum: x + y,
				difference: x - y,
				product: x * y,
				quotient: y !== 0 ? x / y : null,
				power: Math.pow(x, 2),
				sqrt: Math.sqrt(Math.abs(x)),
				random: Math.random()
			};
		`,
		Input: map[string]interface{}{
			"x": 25,
			"y": 5,
		},
	},
}

func main() {
	// 配置
	baseURL := "http://localhost:3002"

	// 检查服务是否可用
	log.Println("🔍 检查服务状态...")
	tester := NewLoadTester(baseURL)

	resp, err := tester.client.Get(baseURL + "/health")
	if err != nil {
		log.Fatalf("❌ 无法连接到服务: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Fatalf("❌ 服务状态异常: %d", resp.StatusCode)
	}
	log.Println("✅ 服务状态正常")

	// 运行不同级别的压力测试

	// 1. 预热测试 (100并发, 1000请求)
	log.Println("\n🔥 预热测试 (100并发, 1000请求)")
	warmupTester := NewLoadTester(baseURL)
	warmupTester.RunBenchmark(100, 1000, testCases)

	// 等待一段时间
	time.Sleep(2 * time.Second)

	// 2. 中等压力测试 (500并发, 5000请求)
	log.Println("\n🚀 中等压力测试 (500并发, 5000请求)")
	mediumTester := NewLoadTester(baseURL)
	mediumTester.RunBenchmark(500, 5000, testCases)

	// 等待一段时间
	time.Sleep(2 * time.Second)

	// 3. 高压力测试 (1000并发, 10000请求)
	log.Println("\n💥 高压力测试 (1000并发, 10000请求)")
	highTester := NewLoadTester(baseURL)
	highTester.RunBenchmark(1000, 10000, testCases)

	log.Println("\n🎉 所有压力测试完成!")
}

