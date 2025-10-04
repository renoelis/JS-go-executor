package router

import (
	"os"

	"flow-codeblock-go/controller"

	"github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter(executorController *controller.ExecutorController) *gin.Engine {
	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// 中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Flow路由组
	flowGroup := router.Group("/flow")
	{
		flowGroup.POST("/codeblock", executorController.Execute)
		flowGroup.GET("/health", executorController.Health)
		flowGroup.GET("/status", executorController.Stats)
		flowGroup.GET("/limits", executorController.Limits)
	}

	// 根路径路由
	router.GET("/health", executorController.SimpleHealth)
	router.GET("/", executorController.Root)

	return router
}

// corsMiddleware CORS中间件
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accessToken")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
