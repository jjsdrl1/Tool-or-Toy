# PromptCraft Studio — 架构设计与功能说明文档

> 版本：v1.2 · 最后更新：2026-05-29 定位：面向 LLM 应用开发者的 Prompt 工程化管理平台

---

## 1. 项目定位

PromptCraft Studio 是一个面向 LLM 应用开发者的 ​**Prompt 工程化管理平台**​，定位是 ​**Prompt 的 Postman + Git diff**。

### 核心价值

开发者在构建 AI 应用时，通常会积累大量混乱的 prompt 文件：

```
summary_prompt_v1.txt
summary_prompt_final.txt
summary_prompt_final_final.txt
summary_prompt_new_0520.txt
```

PromptCraft Studio 解决的问题：

|问题|解决方案|
| ------------------------------| ---------------------------------------|
|Prompt 散落各处，难以追踪|项目化管理，版本快照|
|不知道哪个版本效果最好|流式并排对比输出|
|手动填变量，测试繁琐|变量模板 + 批量样例|
|满意的 prompt 难以迁移到代码|一键导出 Python / TypeScript SDK 代码|
|不同模型需要切换配置|API Preset 多配置管理|
|相同 Prompt 在不同模型间效果难比较|模型对比（固定 Prompt，多模型批量跑）|

### 功能边界

**包含：**

- Prompt 项目化创建与管理
- Prompt 版本迭代（draft / stable / deprecated）
- 变量模板解析与填充
- 模型 API 配置（支持任意 OpenAI-Compatible 接口）
- SSE 流式输出（含并发多列对比）
- 版本 diff 与对比标注
- 批量测试样例管理
- 模型对比（固定版本，多 Preset 批量矩阵对比）
- 代码导出（Python / TypeScript）

**不包含：**

- 用户账号体系（单机版，无多租户）
- LLM 评估（eval）平台功能
- Agent / 多轮对话编排
- 模型训练 / 微调

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│              PromptCraft Studio 前端 (React + Vite)          │
│                                                             │
│  ProjectListPage  PromptEditorPage  VersionComparePage      │
│  BatchTestPage  ModelComparePage  CodeExportPage            │
│  ModelPresetPage  ProjectDetailPage                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
               ┌───────────┴────────────┐
               │  HTTP/JSON (REST)       │  SSE (流式输出)
               │  GET/POST/PUT/DELETE    │  text/event-stream
               ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Boot 3 Backend                      │
│                                                             │
│  Controller 层                                              │
│  ├─ ProjectController         项目 CRUD                     │
│  ├─ PromptVersionController   版本管理                       │
│  ├─ RunController             单次运行 + SSE 流式            │
│  ├─ CompareController         版本对比                       │
│  ├─ TestCaseController        测试样例管理                   │
│  ├─ BatchRunController        批量测试任务                   │
│  ├─ ApiPresetController       模型配置管理                   │
│  ├─ VariableSnapshotController 版本变量组快照                │
│  ├─ BatchCompareController    模型对比任务                   │
│  ├─ HealthController          健康检查                       │
│  └─ ExportController          代码导出                       │
│                                                             │
│  Service 层                                                  │
│  ├─ ProjectService            VersionService                │
│  ├─ PromptRunService          CompareService                │
│  ├─ TestCaseService           BatchTestService              │
│  ├─ ApiPresetService          CodeExportService             │
│  ├─ VariableSnapshotService                                 │
│  ├─ BatchCompareService       (模型对比矩阵执行)             │
│  └─ LlmGatewayService         (统一 LLM 代理)               │
│                                                             │
│  LLM Client 层                                              │
│  ├─ LlmClient (接口)  LlmRequest  LlmResponse              │
│  ├─ LlmMessage  LlmStreamStats                              │
│  ├─ OpenAiCompatibleClient    (OpenAI / DeepSeek / Qwen 等) │
│  ├─ AnthropicClient           (Claude 系列)                 │
│  └─ OllamaClient              (本地模型)                    │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│       MySQL 8         │    │         LLM Providers            │
│                      │    │                                 │
│  project             │    │  OpenAI  /  Azure OpenAI        │
│  prompt_version      │    │  Anthropic Claude               │
│  api_preset          │    │  DeepSeek  /  Qwen  /  Moonshot │
│  test_case           │    │  Ollama  /  LM Studio           │
│  run_record          │    │  任意 OpenAI-Compatible API      │
│  compare_record      │    └─────────────────────────────────┘
│  batch_run           │
│  batch_run_item      │
│  batch_compare_group │
│  variable_snapshot   │
└──────────────────────┘
```

---

## 3. 技术选型

### 3.1 前端

|技术|版本|用途|
| ---------------| ------| -----------------------------|
|React|18+|UI 框架|
|TypeScript|5+|类型安全|
|Vite|5+|构建工具|
|Tailwind CSS|3+|样式|
|Zustand|4+|状态管理|
|React Router|6+|路由|
|Monaco Editor|可选|代码编辑器（高亮 {{变量}}）|

**流式输出专项：**  使用原生 `fetch`​ + `ReadableStream`​ API，​**不使用 Axios**（Axios 不支持流式处理，会等响应完成后才返回）。

### 3.2 后端

|技术|版本|用途|
| --------------| -------------| ------------------|
|Spring Boot|3.x|应用框架|
|Java|17+|运行环境|
|MyBatis-Plus|3.5+|ORM 框架|
|Lombok|-|减少样板代码|
|Jackson|-|JSON 序列化|
|SseEmitter|Spring 内置|SSE 流式输出|
|Hutool|可选|工具类|
|Freemarker|-|代码导出模板渲染|

### 3.3 数据库

|技术|版本|说明|
| ---------| ------| ---------------------------|
|MySQL|8.0+|主数据库|
|utf8mb4|-|支持 emoji + 中文全文检索|

用户本机自行安装 MySQL，项目不内置数据库容器。

---

## 4. 流式输出架构（核心改进）

流式输出是 PromptCraft Studio 的核心交互，涉及后端 SSE 推送、前端流接收、React 状态批量更新三个环节。

### 4.1 后端：SseEmitter 设计

#### 问题

Spring 默认 `SseEmitter` 超时时间 30s，大模型长响应会被截断。

#### 改进方案

```java
// RunController.java
@GetMapping(value = "/api/runs/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public SseEmitter streamRun(@RequestParam Long versionId,
                            @RequestParam Long presetId,
                            @RequestParam String variablesJson) {

    // ① 超时设置为 180s，覆盖慢速模型
    SseEmitter emitter = new SseEmitter(180_000L);

    // ② 使用独立线程池，不阻塞请求线程
    sseExecutor.execute(() -> {
        try {
            promptRunService.streamRun(versionId, presetId, variablesJson, emitter);
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    });

    // ③ 超时 / 完成 / 错误时统一清理
    emitter.onTimeout(emitter::complete);
    emitter.onError(e -> emitter.complete());

    return emitter;
}
```

#### SSE 事件格式规范

后端推送统一使用结构化 JSON 事件，前端解析更健壮：

```
event: chunk
data: {"type":"chunk","content":"这是"}

event: chunk
data: {"type":"chunk","content":"一段输出"}

event: stats
data: {"type":"stats","inputTokens":128,"outputTokens":312,"latencyMs":1340,"model":"gpt-4o-mini"}

event: done
data: {"type":"done","runRecordId":42}

event: error
data: {"type":"error","message":"API Key invalid"}
```

> 解析容错：SSE 规范允许 `data:` 后空格可省略，而 Spring `SseEmitter` 默认输出 `data:{json}` 不带空格。
> 前端 `useStreamRun` 同时兼容 `data: {...}` 与 `data:{...}` 两种格式。

#### CORS 配置

SSE 接口必须显式允许 `text/event-stream` 响应头：

```java
// CorsConfig.java
@Bean
public CorsFilter corsFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(allowedOrigins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    // SSE 必须暴露以下响应头
    config.setExposedHeaders(List.of(
        "Content-Type",
        "Cache-Control",
        "X-Accel-Buffering"   // 关闭 Nginx 缓冲（生产环境必须）
    ));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return new CorsFilter(source);
}
```

#### 线程池配置

```java
// AppConfig.java
@Bean("sseExecutor")
public Executor sseExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(10);
    executor.setMaxPoolSize(50);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("sse-stream-");
    executor.setKeepAliveSeconds(60);
    executor.initialize();
    return executor;
}
```

---

### 4.2 前端：流式接收设计

#### 问题

Axios 不支持 `ReadableStream`​，`EventSource` 只支持 GET 请求且不能传 body。

#### 改进方案：封装 `useStreamRun` Hook

```typescript
// hooks/useStreamRun.ts

interface StreamChunk {
  type: 'chunk' | 'stats' | 'done' | 'error';
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  model?: string;
  runRecordId?: number;
  message?: string;
}

interface UseStreamRunReturn {
  output: string;
  stats: RunStats | null;
  isStreaming: boolean;
  error: string | null;
  startStream: (params: RunParams) => void;
  cancelStream: () => void;
}

export function useStreamRun(): UseStreamRunReturn {
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState<RunStats | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 用 ref 持有 AbortController，支持取消
  const abortRef = useRef<AbortController | null>(null);

  // 批量 append buffer，避免每个 token 触发 re-render
  const bufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushBuffer = useCallback(() => {
    if (bufferRef.current) {
      setOutput(prev => prev + bufferRef.current);
      bufferRef.current = '';
    }
  }, []);

  const startStream = useCallback(async (params: RunParams) => {
    // 取消上一次未完成的请求
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setOutput('');
    setStats(null);
    setError(null);
    setIsStreaming(true);
    bufferRef.current = '';

    // 每 50ms 批量刷新一次 buffer → 最多 20fps 更新频率
    flushTimerRef.current = setInterval(flushBuffer, 50);

    try {
      const response = await fetch('/api/runs/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';  // 最后一行可能不完整，保留

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: StreamChunk = JSON.parse(line.slice(6));
              handleChunk(chunk);
            } catch {
              // 忽略非 JSON 行（如 SSE 注释）
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      // 清理：刷新剩余 buffer，停止定时器
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushBuffer();
      setIsStreaming(false);
    }
  }, [flushBuffer]);

  const handleChunk = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'chunk':
        // 写入 buffer，由定时器批量刷新
        bufferRef.current += chunk.content ?? '';
        break;
      case 'stats':
        setStats({
          inputTokens: chunk.inputTokens ?? 0,
          outputTokens: chunk.outputTokens ?? 0,
          latencyMs: chunk.latencyMs ?? 0,
          model: chunk.model ?? '',
        });
        break;
      case 'error':
        setError(chunk.message ?? '未知错误');
        break;
    }
  };

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    setIsStreaming(false);
  }, []);

  return { output, stats, isStreaming, error, startStream, cancelStream };
}
```

#### 版本对比：两列并发 SSE

版本对比页面需要同时运行两个 SSE 流，各自独立 hook 实例：

```typescript
// pages/VersionComparePage.tsx

export function VersionComparePage() {
  const streamA = useStreamRun();  // 版本 A 独立实例
  const streamB = useStreamRun();  // 版本 B 独立实例

  const runCompare = () => {
    // 并发启动两个流，互不阻塞
    streamA.startStream({ versionId: selectedVersionA, ... });
    streamB.startStream({ versionId: selectedVersionB, ... });
  };

  // 取消时同时终止两个流
  const cancelAll = () => {
    streamA.cancelStream();
    streamB.cancelStream();
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <StreamOutputPanel
        label={`版本 ${versionA.versionNo}`}
        output={streamA.output}
        stats={streamA.stats}
        isStreaming={streamA.isStreaming}
        error={streamA.error}
      />
      <StreamOutputPanel
        label={`版本 ${versionB.versionNo}`}
        output={streamB.output}
        stats={streamB.stats}
        isStreaming={streamB.isStreaming}
        error={streamB.error}
      />
    </div>
  );
}
```

#### 性能优化细节

|问题|原因|解决方案|
| -------------| ---------------------------------------| ---------------------------------------|
|卡顿 / 掉帧|每个 token 触发 setState → re-render|​`bufferRef`暂存，每 50ms 批量 flush|
|内存泄漏|组件卸载后 timer 未清理|​`useEffect`​cleanup 或在`finally`清理 timer|
|请求堆叠|重复点击运行，上次 SSE 未终止|​`AbortController`，新请求前先 abort 旧请求|
|不完整行|网络分包导致 SSE 行被截断|​`lineBuffer`保留末尾不完整行，下次 chunk 拼接|
|Nginx 缓冲|生产环境 Nginx 默认缓冲响应|响应头加`X-Accel-Buffering: no`|

---

### 4.3 流式输出数据流全图

```
用户点击「运行」
      │
      ▼
useStreamRun.startStream()
      │
      │  POST /api/runs/stream (fetch + ReadableStream)
      ▼
RunController.streamRun()
      │
      │  sseExecutor 线程池异步执行
      ▼
PromptRunService
  ① 解析 {{变量}}, 渲染 prompt
  ② 查询 ApiPreset, 解密 API Key
  ③ LlmClientFactory.getClient(provider)
      │
      ▼
OpenAiCompatibleClient / AnthropicClient
  调用模型 API (HTTP stream)
      │
      │  token by token
      ▼
SseEmitter.send(SseEventBuilder)
  event: chunk
  data: {"type":"chunk","content":"..."}
      │
      │  SSE push  (text/event-stream)
      ▼
浏览器 ReadableStream reader.read()
      │
      │  写入 bufferRef
      ▼
setInterval 每 50ms flush
      │
      ▼
React setState → re-render
StreamOutputPanel 显示滚动文本
      │
      │  流结束
      ▼
SseEmitter.send(stats 事件)
SseEmitter.send(done 事件)
SseEmitter.complete()
      │
      ▼
PromptRunService.saveRunRecord()  异步写库
```

---

## 5. 数据库设计

### 5.1 总览

```
project               Prompt 项目
prompt_version        Prompt 版本
api_preset            模型配置（含加密 API Key）
test_case             测试样例
run_record            单次运行记录
compare_record        版本对比记录（两版本手动标注）
batch_run             批量运行任务（含使用的 preset_id）
batch_run_item        批量运行明细
batch_compare_group   模型对比组（关联多个 batch_run）
variable_snapshot     版本级变量组快照（保存/复用变量填写值）
```

---

### 5.2 完整建表 SQL（`scripts/mysql/init.sql`）

```sql
CREATE DATABASE IF NOT EXISTS promptcraft
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE promptcraft;

-- ─────────────────────────────────────────────────
-- project 项目表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project (
    id                BIGINT       PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(128) NOT NULL          COMMENT '项目名称',
    description       TEXT                           COMMENT '项目描述',
    tags              JSON                           COMMENT '标签数组 ["summary","translation"]',
    stable_version_id BIGINT       NULL              COMMENT '当前 stable 版本 ID（唯一真相源）',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Prompt 项目表';

-- ─────────────────────────────────────────────────
-- prompt_version 版本表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_version (
    id              BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id      BIGINT        NOT NULL            COMMENT '所属项目 ID',
    version_no      INT           NOT NULL            COMMENT '版本号，项目内递增',
    system_prompt   MEDIUMTEXT                        COMMENT 'System Prompt 内容',
    user_prompt     MEDIUMTEXT    NOT NULL            COMMENT 'User Prompt 内容（含 {{变量}}）',
    note            VARCHAR(512)                      COMMENT '版本备注（必填）',
    status          VARCHAR(32)   NOT NULL DEFAULT 'draft'
                                                      COMMENT 'draft / stable / deprecated',
    model_provider  VARCHAR(64)                       COMMENT '测试时使用的模型提供商',
    model_name      VARCHAR(128)                      COMMENT '测试时使用的模型名称',
    temperature     DECIMAL(4,2)                      COMMENT '测试时使用的 temperature',
    max_tokens      INT                               COMMENT '测试时使用的 max_tokens',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX  idx_project_id (project_id),
    UNIQUE KEY uk_project_version (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Prompt 版本表';

-- ─────────────────────────────────────────────────
-- api_preset 模型配置表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_preset (
    id                BIGINT        PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(128)  NOT NULL            COMMENT '配置预设名称',
    provider          VARCHAR(64)   NOT NULL            COMMENT 'openai / anthropic / ollama 等',
    base_url          VARCHAR(512)                      COMMENT 'API Base URL',
    api_key_encrypted TEXT                              COMMENT 'AES-256-GCM 加密后的 API Key',
    model_name        VARCHAR(128)  NOT NULL            COMMENT '模型名称',
    temperature       DECIMAL(4,2)  DEFAULT 0.70,
    max_tokens        INT           DEFAULT 1024,
    enabled           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模型 API 配置表';

-- ─────────────────────────────────────────────────
-- test_case 测试样例表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_case (
    id              BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id      BIGINT        NOT NULL            COMMENT '所属项目 ID',
    name            VARCHAR(128)  NOT NULL            COMMENT '样例名称',
    variables_json  JSON          NOT NULL            COMMENT '变量键值对 {"role":"翻译","content":"..."}',
    expected_output TEXT                              COMMENT '期望输出（可选，供参考）',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试样例表';

-- ─────────────────────────────────────────────────
-- run_record 运行记录表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS run_record (
    id                      BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id              BIGINT        NOT NULL,
    version_id              BIGINT        NULL              COMMENT '关联版本 ID',
    api_preset_id           BIGINT        NULL              COMMENT '关联配置预设 ID',
    variables_json          JSON          NOT NULL          COMMENT '本次运行的变量值',
    rendered_system_prompt  MEDIUMTEXT                      COMMENT '变量填充后的 System Prompt',
    rendered_user_prompt    MEDIUMTEXT                      COMMENT '变量填充后的 User Prompt',
    output_text             MEDIUMTEXT                      COMMENT '模型输出文本',
    input_chars             INT                             COMMENT '输入字符数',
    output_chars            INT                             COMMENT '输出字符数',
    input_tokens            INT                             COMMENT '输入 token 数',
    output_tokens           INT                             COMMENT '输出 token 数',
    latency_ms              INT                             COMMENT '响应耗时（毫秒）',
    success                 BOOLEAN       NOT NULL DEFAULT TRUE,
    error_message           TEXT,
    model_provider          VARCHAR(64),
    model_name              VARCHAR(128),
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_project_id (project_id),
    INDEX idx_version_id  (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运行记录表';

-- ─────────────────────────────────────────────────
-- compare_record 版本对比记录表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compare_record (
    id                BIGINT    PRIMARY KEY AUTO_INCREMENT,
    project_id        BIGINT    NOT NULL,
    version_a_id      BIGINT    NOT NULL,
    version_b_id      BIGINT    NOT NULL,
    run_a_id          BIGINT    NULL,
    run_b_id          BIGINT    NULL,
    winner_version_id BIGINT    NULL            COMMENT '人工标注的更优版本',
    reason            TEXT                      COMMENT '标注原因',
    created_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本对比记录表';

-- ─────────────────────────────────────────────────
-- batch_run 批量运行任务表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_run (
    id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
    project_id    BIGINT       NOT NULL,
    version_id    BIGINT       NOT NULL,
    preset_id     BIGINT       NULL                  COMMENT '使用的模型配置 ID',
    compare_group_id BIGINT   NULL                  COMMENT '关联对比组 ID（可选）',
    status        VARCHAR(32)  NOT NULL DEFAULT 'pending'
                                        COMMENT 'pending / running / done / failed',
    total_count   INT          DEFAULT 0,
    success_count INT          DEFAULT 0,
    failed_count  INT          DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at   DATETIME     NULL,

    INDEX idx_project_id (project_id),
    INDEX idx_version_id (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量运行任务表';

-- ─────────────────────────────────────────────────
-- batch_run_item 批量运行明细表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_run_item (
    id            BIGINT      PRIMARY KEY AUTO_INCREMENT,
    batch_run_id  BIGINT      NOT NULL,
    test_case_id  BIGINT      NOT NULL,
    run_record_id BIGINT      NULL              COMMENT '关联 run_record（成功后填入）',
    status        VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_batch_run_id (batch_run_id),
    INDEX idx_test_case_id (test_case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量运行明细表';

-- ─────────────────────────────────────────────────
-- batch_compare_group 批量对比组表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_compare_group (
    id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
    project_id    BIGINT       NOT NULL,
    mode          VARCHAR(32)  NOT NULL          COMMENT 'compare_versions / compare_presets',
    status        VARCHAR(32)  NOT NULL DEFAULT 'pending'
                                        COMMENT 'pending / running / done / failed',
    name          VARCHAR(256)                   COMMENT '对比任务名称',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at   DATETIME     NULL,

    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量对比组表';

-- ─────────────────────────────────────────────────
-- variable_snapshot 版本变量组快照表
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS variable_snapshot (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    version_id      BIGINT       NOT NULL              COMMENT '所属版本 ID',
    name            VARCHAR(128) NOT NULL              COMMENT '变量组名称',
    variables_json  JSON         NOT NULL              COMMENT '变量键值对 JSON',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_version_id (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本变量组快照表';
```

### 5.3 数据库设计说明

**stable 状态唯一真相源**

​`project.stable_version_id`​ 是 stable 版本的唯一权威字段。`prompt_version.status` 仅供展示，不参与业务判断。更新 stable 版本时：

```java
// VersionService.java - 事务保证原子性
@Transactional
public void setStable(Long projectId, Long versionId) {
    // 1. 更新 project.stable_version_id
    projectMapper.updateStableVersionId(projectId, versionId);
    // 2. 同步 status 字段（仅展示用）
    versionMapper.resetAllStatus(projectId, "draft");
    versionMapper.updateStatus(versionId, "stable");
}
```

**API Key 加密**

使用 AES-256-GCM，IV 每次随机生成，IV + 密文 Base64 存入 `api_key_encrypted`：

```java
// ApiKeyEncryptor.java
public String encrypt(String plainKey) {
    byte[] iv = new byte[12];
    new SecureRandom().nextBytes(iv);  // ← IV 必须随机，禁止复用
    // AES/GCM/NoPadding 加密
    // 返回 Base64(iv + ciphertext)
}
```

**tags 字段**

使用 `JSON` 类型存储标签数组，支持 MySQL JSON 函数查询：

```sql
-- 查询包含 "summary" 标签的项目
SELECT * FROM project WHERE JSON_CONTAINS(tags, '"summary"');
```

**变量组快照（variable_snapshot）**

用于保存某个版本下"一组变量填写值"，方便在编辑器中反复回放典型测试样例：

- 隶属于 `prompt_version`，不跨版本共享（不同版本的变量名集合可能不同）
- 写入时由前端把 `Map<String,String>` 序列化成 `variables_json`
- 应用快照时，只回填当前 `detectedVars` 中存在的键，多余键忽略（避免脏数据污染表单）

**批量运行的 `preset_id`**

`batch_run.preset_id` 记录该批次实际使用的模型配置 ID，便于进度页和历史回顾页展示"用哪个配置跑的"。
若 preset 后续被删除，该字段允许为 NULL，不做外键约束。

---

## 6. 后端模块设计

### 6.1 LLM 网关层

所有模型调用统一走 `LlmGatewayService`，Controller 层不直接依赖任何 LLM SDK。

```
LlmClient (接口)
├── chat(LlmRequest) : LlmResponse           # 非流式
└── streamChat(LlmRequest) : void            # 流式（回调 emitter）

LlmClientFactory
└── getClient(provider, baseUrl, apiKey) : LlmClient

实现类：
├── OpenAiCompatibleClient   # 兼容 OpenAI / Azure / DeepSeek / Qwen / Moonshot /
│                            # Doubao / Hunyuan / Zhipu / MiniMax / StepFun /
│                            # SiliconFlow / OpenRouter / LM Studio / 自定义
├── AnthropicClient          # Anthropic Messages API（与 OpenAI 格式不同）
└── OllamaClient             # Ollama 本地 API
```

​`OpenAiCompatibleClient`​ 覆盖所有 OpenAI-Compatible API，`AnthropicClient`​ 独立实现是因为 Anthropic API 请求/响应格式与 OpenAI 不同（`messages` 结构、SSE 事件名均有差异）。
`LlmClientFactory` 通过 `provider` 字段路由：`anthropic` → AnthropicClient，`ollama` → OllamaClient，其余全部走 OpenAiCompatibleClient。

### 6.2 变量解析与渲染

```java
// VariableParser.java
// 从 prompt 文本中提取所有 {{变量名}}
List<String> parseVariables(String promptText);

// PromptRenderer.java
// 用 variables Map 替换 {{变量名}}，返回渲染后文本
String render(String template, Map<String, String> variables);
```

渲染规则：

- 变量名区分大小写
- 未填写的变量保留原始 `{{变量名}}` 占位符（不报错，方便调试）
- 同一变量名多次出现，全部替换

### 6.3 代码导出模块

使用 Freemarker 模板引擎，避免字符串拼接：

```
templates/export/
├── python_openai.ftl         # Python + openai SDK
├── python_anthropic.ftl      # Python + anthropic SDK
├── typescript_openai.ftl     # TypeScript + openai SDK
└── typescript_anthropic.ftl  # TypeScript + @anthropic-ai/sdk
```

导出内容包含：

- 函数定义（变量 → 函数参数）
- API Key 读取 `os.environ["API_KEY"]`（不硬编码）
- Base URL 配置（来自保存时的 ApiPreset）
- 模型名、temperature、max\_tokens 固定参数

---

## 7. 前端模块设计

### 7.1 页面路由

```
/                             → 重定向到 /projects
/projects                     项目列表
/projects/:id                 项目详情（版本时间线 + 版本管理）
/projects/:id/editor          Prompt 编辑器 + 运行
/projects/:id/editor/:vid     编辑指定版本
/projects/:id/compare         版本对比（两版本并排 SSE 对比）
/projects/:id/batch-test      批量测试（版本 × 样例矩阵）
/projects/:id/model-compare   模型对比（固定版本，多模型 × 样例矩阵）
/projects/:id/export          代码导出
/settings/presets             模型配置管理
```

### 7.2 状态管理（Zustand）

```typescript
// projectStore.ts
interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  fetchProjects: () => void;
  setCurrentProject: (p: Project) => void;
}

// editorStore.ts
interface EditorStore {
  systemPrompt: string;
  userPrompt: string;
  variables: Record<string, string>;     // 变量名 → 当前填写的值
  detectedVars: string[];                // 从 prompt 中自动解析的变量名列表
  selectedVersionId: number | null;
  selectedPresetId: number | null;
  setPrompt: (system: string, user: string) => void;
  setVariable: (key: string, value: string) => void;
}

// runStore.ts
interface RunStore {
  runHistory: RunRecord[];               // 当前版本的运行历史
  addRunRecord: (r: RunRecord) => void;
}
```

### 7.3 核心工具函数

```typescript
// utils/variableParser.ts
// 从 prompt 文本中提取变量名列表
parseVariables(text: string): string[]

// utils/promptRenderer.ts
// 渲染 prompt，高亮未填充的变量
renderPrompt(template: string, vars: Record<string, string>): string
previewPrompt(template: string, vars: Record<string, string>): string  // 带高亮的 HTML

// utils/tokenEstimator.ts
// 基于字符数估算 token 数（1 token ≈ 4 chars，中文 ≈ 2 chars/token）
estimateTokens(text: string, lang?: 'zh' | 'en'): number

// utils/diff.ts
// 两版本 prompt 的逐行 diff
diffPrompt(a: string, b: string): DiffLine[]
```

---

## 8. API 接口设计

### 8.1 项目接口

```
GET    /api/projects                   获取项目列表（支持 tag、keyword 过滤）
POST   /api/projects                   创建项目
GET    /api/projects/:id               获取项目详情
PUT    /api/projects/:id               更新项目
DELETE /api/projects/:id               删除项目
PUT    /api/projects/:id/stable        设置 stable 版本
```

### 8.2 版本接口

```
GET    /api/projects/:pid/versions     获取版本列表
POST   /api/projects/:pid/versions     保存新版本
GET    /api/versions/:id               获取版本详情
PUT    /api/versions/:id/status        更新版本状态
POST   /api/versions/:id/fork          从此版本 fork 新版本
DELETE /api/versions/:id               删除版本
GET    /api/versions/diff?a=:id&b=:id  获取两版本 diff
```

### 8.3 运行接口

```
POST /api/runs                         非流式单次运行（返回完整结果）
POST /api/runs/stream                  流式单次运行（SSE）
GET  /api/projects/:pid/runs           获取项目运行历史
GET  /api/runs/:id                     获取单条运行记录
```

### 8.4 版本对比接口

```
POST /api/compares                     创建对比记录
GET  /api/projects/:pid/compares       获取项目对比历史
PUT  /api/compares/:id/winner          标注更优版本
```

### 8.5 测试样例接口

```
GET    /api/projects/:pid/test-cases   获取样例列表
POST   /api/projects/:pid/test-cases   创建样例
PUT    /api/test-cases/:id             更新样例
DELETE /api/test-cases/:id             删除样例
POST   /api/projects/:pid/test-cases/import   导入 CSV
GET    /api/projects/:pid/test-cases/export   导出 CSV
```

### 8.6 批量运行接口

```
POST /api/batch-runs                   创建批量运行任务
GET  /api/batch-runs/:id               获取任务状态和进度
GET  /api/projects/:pid/batch-runs     获取项目批量运行历史
GET  /api/batch-runs/:id/export        导出结果 CSV
```

### 8.7 模型配置接口

```
GET    /api/presets                    获取所有配置预设
POST   /api/presets                    创建配置预设
PUT    /api/presets/:id                更新配置预设
DELETE /api/presets/:id                删除配置预设
POST   /api/presets/:id/test           测试配置是否可用
```

### 8.8 代码导出接口

```
POST /api/export/code                  导出 SDK 代码（请求体携带 language + provider）
POST /api/export/json                  导出 JSON 配置
```

返回结构：`{ code, language, filename, functionName }`，`functionName` 用于前端拼接下载文件名。

### 8.9 模型对比接口

```
POST /api/batch-compares                    创建模型对比任务
GET  /api/batch-compares/:id               获取对比结果（矩阵 VO）
GET  /api/projects/:pid/batch-compares     获取项目对比历史列表
```

请求体（POST）字段：

| 字段 | 说明 |
| --- | --- |
| `mode` | `compare_presets`（固定版本，多模型）或 `compare_versions`（固定模型，多版本）|
| `fixedVersionId` | mode=compare_presets 时必填 |
| `fixedPresetId` | mode=compare_versions 时必填 |
| `presetIds` | mode=compare_presets 时指定要对比的模型配置 ID 列表（≥2）|
| `versionIds` | mode=compare_versions 时指定要对比的版本 ID 列表（≥2）|
| `testCaseIds` | 参与本次对比的测试样例 ID 列表（≥1）|
| `concurrency` | 并发数（默认 2，最大 5）|

返回 `BatchCompareResultVO`：`columns`（每列元数据）+ `rows`（每行 = 一条样例，`cells` = 各列结果）。

---

### 8.10 变量组快照接口

```
GET    /api/versions/:vid/variable-snapshots   获取版本下所有变量组
POST   /api/versions/:vid/variable-snapshots   保存当前变量值为变量组
DELETE /api/variable-snapshots/:id             删除变量组
```

### 8.11 健康检查接口

```
GET /api/health    返回 {"status":"UP"}，用于部署存活探测
```

请求体（POST）：`{ name: string, variables: Record<string, string> }`。

---

## 9. 功能模块详细说明

### 9.1 Prompt 项目管理

**创建项目**

- 必填：项目名称（唯一）
- 必填：项目描述（说明该项目 prompt 的用途和目标受众）
- 可选：标签（多选，用于分类过滤）

**项目列表**

- 卡片展示：名称、描述摘要、stable 版本号、最近修改时间、版本总数
- 支持按标签过滤、按关键词搜索（搜索名称 + 描述 + prompt 内容）
- 整个项目（含所有版本 + 测试样例）可一键导出为 JSON

---

### 9.2 Prompt 模板编辑器

**API 配置区（编辑器顶部常驻）**

- Base URL 输入框（示例：`https://api.openai.com/v1`）
- API Key 输入框（遮蔽显示，本地加密存储到 `api_preset` 表）
- 模型选择（下拉列表 + 手动输入 model string）
- Temperature 滑块（0.0 \~ 2.0）
- Max Tokens 输入（整数）
- 配置可保存为"预设"，一键切换不同模型配置

**模板编辑区**

- System Prompt 区域 + User Prompt 区域，各自独立
- ​`{{变量名}}` 自动识别、高亮显示
- 右侧自动生成对应变量的输入表单
- 字符数实时统计（输入/输出分别统计）
- Token 数预估（基于字符数估算，显示为"\~xxx tokens"）

**变量组快照（VariablePanel）**

- 可将当前变量填写值整体保存为"变量组"，归属当前选中版本
- 历史变量组列表内可一键回放（点击应用变量值；仅回填当前版本仍存在的变量，多余键忽略）
- 支持删除单个变量组
- 接口走 [8.9 变量组快照接口](#89-变量组快照接口)，状态通过 `editorStore.applyVariables` 写回

**运行与输出**

- 点击「运行」后，SSE 流式输出到右侧输出区
- 输出区逐 token 渲染，滚动跟随最新内容
- 运行完成后显示统计卡片：

  - 输入字符数 / 输出字符数
  - 输入 token 数 / 输出 token 数
  - 响应耗时（ms）
  - 实际使用的模型名
- 每次运行结果自动缓存（可翻看历史运行记录）
- 支持中途「取消」运行

---

### 9.3 版本管理

**版本创建规则**

- 每次保存编辑器内容必须填写版本备注（强制，避免无意义提交）
- 版本号在项目内自动递增（v1, v2, v3...）
- 历史版本不可覆盖，只能创建新版本（保护历史记录）

**版本时间线**

每个版本展示：版本号、备注、保存时间、状态、测试时使用的模型、最近一次运行的 token 消耗。

**版本状态**

- ​`draft`（默认）：开发中，可随时修改
- ​`stable`：生产就绪，项目内唯一 stable
- ​`deprecated`：已废弃，不推荐使用

**版本操作**

- 一键切换到任意历史版本在编辑器中查看
- 从任意历史版本 fork 出新版本继续实验
- 删除版本（stable 版本不可删除）

**版本 Diff**

- 任意选择两个版本，查看 prompt 内容的逐行增删 diff
- 差异高亮：绿色为新增行，红色为删除行

---

### 9.4 版本对比

**使用方式**

在项目版本列表中选择两个版本，点击「对比」进入对比页面。只能选取**同一项目内**的版本。

**对比界面**

- 左右双列并排布局
- 顶部：两版本 prompt 的 diff 预览（折叠/展开）
- 中间：变量填写表单（两列共用同一组变量值）
- 点击「同时运行」，两列同时发起 SSE 流式输出
- 两列输出区独立滚动，或「联动滚动」模式
- 每列底部：字符数、token 数、响应耗时对比

**结果标注**

- 人工标注「A 更好」或「B 更好」，可选填原因
- 标注结果保存到 `compare_record` 表，可在项目历史中回顾

---

### 9.5 批量测试

**测试样例管理**

- 样例隶属于项目级别，可在项目所有版本间复用
- 表格视图：行 \= 样例，列 \= 变量，单元格直接编辑
- 支持导入 CSV（格式：第一行为变量名列头，后续行为样例数据）
- 支持导出样例为 CSV

**批量运行**

- 选择版本 + 模型配置，选中要运行的样例（全选或多选）
- 一键批量运行，并发执行（受 API 速率限制可配置并发数）
- 实时显示运行进度（X / N 完成）
- 结果矩阵：行 \= 样例，列 \= 版本（跨版本批量对比时）
- 每格显示输出摘要（前 100 字符）+ hover 查看完整输出
- 导出完整结果为 CSV（含输入变量 + 输出 + token 统计）

---

### 9.6 模型对比

**使用方式**

在项目侧边栏进入「模型对比」页面（路由 `/projects/:id/model-compare`）。

**两种对比模式**

| 模式 | 固定 | 变量 | 适用场景 |
| --- | --- | --- | --- |
| `compare_presets` | Prompt 版本 | 多个模型配置 | 同一 Prompt，哪个模型更好？|
| `compare_versions` | 模型配置 | 多个版本 | 哪个版本 Prompt 对同一模型效果更好？|

当前 UI 仅暴露 `compare_presets` 模式（前端 `ModelComparePage` 仅展示此类型历史）；`compare_versions` 走 `BatchTestPage`。

**操作流程**

1. 「配置与样例」Tab：选择固定版本 → 多选模型配置 → 在下方样例表选中样例 → 点击「开始模型对比」
2. 任务创建后自动切换到「对比结果」Tab，前端每 2s 轮询任务状态
3. 结果以矩阵展示：行 = 测试样例，列 = 模型配置；每格显示输出摘要 + 延迟/Token 统计，点击展开完整输出

**后端执行**

- `BatchCompareServiceImpl` 为每个（版本/Preset）组合创建一个 `BatchRun` 任务，通过 `batchExecutor` 并发执行
- 所有 BatchRun 挂在同一 `BatchCompareGroup` 下，状态由各 BatchRun 聚合推导
- 结果 VO（`BatchCompareResultVO`）包含 `columns`（列元数据）和 `rows`（按样例分行的矩阵数据）

---

### 9.7 代码导出

选择版本后，一键生成可直接运行的 SDK 调用代码。

**Python（openai SDK）**

```python
import os
from openai import OpenAI

def news_summary(role: str, language: str, content: str) -> str:
    client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        base_url="https://api.openai.com/v1",  # 来自 API 配置
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": f"你是一个专业的{role}，请用{language}回答。"},
            {"role": "user", "content": f"请总结以下内容：\n{content}"},
        ],
    )
    return response.choices[0].message.content
```

**TypeScript（@anthropic-ai/sdk）**

```typescript
import Anthropic from "@anthropic-ai/sdk";

export async function newsSummary(
  role: string,
  language: string,
  content: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `你是一个专业的${role}，请用${language}回答。`,
    messages: [{ role: "user", content: `请总结以下内容：\n${content}` }],
  });
  return (message.content[0] as Anthropic.TextBlock).text;
}
```

**导出特性**

- 变量自动转为函数参数
- API Key 替换为 `os.environ`​ / `process.env` 引用（不硬编码）
- Base URL、模型名、temperature、max\_tokens 固定写入（保持与测试时一致）
- 一键复制到剪贴板 / 下载 `.py`​ 或 `.ts` 文件

---

### 9.8 模型配置管理（API Preset）

**配置预设**

每个预设包含：名称、Provider、Base URL、API Key（加密存储）、模型名、Temperature、Max Tokens。

**内置 Provider 模板**

|Provider|默认 Base URL|默认模型|
| ---------------| ---------------| ---------------|
|OpenAI|​`https://api.openai.com/v1`|gpt-4o-mini|
|Anthropic|​`https://api.anthropic.com`|claude-sonnet-4-20250514|
|DeepSeek|​`https://api.deepseek.com/v1`|deepseek-chat|
|Qwen (阿里)|​`https://dashscope.aliyuncs.com/compatible-mode/v1`|qwen-plus|
|Moonshot / Kimi|​`https://api.moonshot.cn/v1`|moonshot-v1-8k|
|火山方舟 / 豆包|​`https://ark.cn-beijing.volces.com/api/v3`|doubao-seed-1-6-250615|
|腾讯混元|​`https://api.hunyuan.cloud.tencent.com/v1`|hunyuan-turbos-latest|
|智谱 GLM|​`https://open.bigmodel.cn/api/paas/v4`|glm-4-flash|
|MiniMax|​`https://api.minimax.io/v1`|MiniMax-M2|
|阶跃星辰 / StepFun|​`https://api.stepfun.ai/step_plan/v1`|step-3.5-flash|
|硅基流动 / SiliconFlow|​`https://api.siliconflow.cn/v1`|deepseek-ai/DeepSeek-V3|
|OpenRouter|​`https://openrouter.ai/api/v1`|openai/gpt-4o-mini|
|Azure OpenAI|手动填写|手动填写|
|Ollama (本地)|​`http://localhost:11434/v1`|llama3|
|LM Studio (本地)|​`http://localhost:1234/v1`|local-model|
|自定义|手动填写|手动填写|

切换 Provider 时，前端自动回填 Base URL；模型名仅在用户尚未输入时回填默认值，避免覆盖用户已选择的模型。

**连通性测试**

保存配置前可一键测试，后端发起一次最小 chat 请求验证配置有效性，返回是否成功及错误信息。

---

## 10. 仓库目录结构

```
promptcraft-studio/
├── README.md
├── .gitignore
├── config/
│   ├── application-local.example.yml
│   └── application-local.yml          # 用户本地创建，不提交 Git
│
├── scripts/
│   ├── start.sh                        # Linux/macOS 启动脚本
│   ├── start.ps1                       # Windows 启动脚本
│   └── mysql/
│       ├── init.sql                    # 首次建库建表（含所有当前表结构）
│       ├── drop.sql                    # 清空所有表（谨慎使用）
│       └── migrations/                 # 后续版本升级 SQL（当前为空，
│                                       # 早期 V2 已合并进 init.sql）
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router/index.tsx
│       ├── pages/
│       │   ├── ProjectListPage.tsx
│       │   ├── ProjectDetailPage.tsx    # 版本时间线 + 版本管理
│       │   ├── PromptEditorPage.tsx
│       │   ├── VersionComparePage.tsx
│       │   ├── BatchTestPage.tsx
│       │   ├── ModelComparePage.tsx     # 模型对比（多 Preset 矩阵）
│       │   ├── CodeExportPage.tsx
│       │   └── ModelPresetPage.tsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── Layout.tsx           # Sidebar + main Outlet 布局
│       │   │   ├── Sidebar.tsx          # 品牌配色侧边栏导航
│       │   │   ├── Breadcrumbs.tsx      # 面包屑 + 操作按钮区
│       │   │   ├── Toast.tsx            # Toast + useToast hook
│       │   │   ├── ConfirmDialog.tsx    # 通用确认对话框
│       │   │   ├── EmptyState.tsx       # 空状态占位组件
│       │   │   └── LoadingSpinner.tsx
│       │   ├── project/
│       │   │   ├── ProjectCard.tsx
│       │   │   └── ProjectForm.tsx
│       │   ├── editor/
│       │   │   ├── PromptEditor.tsx
│       │   │   ├── VariablePanel.tsx
│       │   │   ├── ModelConfigBar.tsx
│       │   │   └── RunOutputPanel.tsx   # 流式输出面板
│       │   ├── version/
│       │   │   ├── VersionTimeline.tsx
│       │   │   ├── VersionStatusBadge.tsx
│       │   │   └── VersionDiffPanel.tsx
│       │   ├── compare/
│       │   │   └── ComparePanel.tsx
│       │   ├── batch/
│       │   │   └── TestCaseTable.tsx
│       │   └── export/
│       │       └── CodePreview.tsx
│       ├── hooks/
│       │   └── useStreamRun.ts         # SSE 流式输出核心 Hook
│       ├── api/
│       │   ├── request.ts              # Fetch 封装（非 Axios）
│       │   ├── projectApi.ts
│       │   ├── versionApi.ts
│       │   ├── runApi.ts               # 含流式接口
│       │   ├── compareApi.ts
│       │   ├── testCaseApi.ts          # 内含 variablesJson 归一化兜底
│       │   ├── batchRunApi.ts
│       │   ├── batchCompareApi.ts      # 模型对比任务
│       │   ├── presetApi.ts
│       │   ├── variableSnapshotApi.ts  # 变量组快照
│       │   └── exportApi.ts
│       ├── stores/
│       │   ├── projectStore.ts
│       │   ├── editorStore.ts
│       │   └── runStore.ts
│       ├── types/
│       │   ├── project.ts / version.ts / runRecord.ts
│       │   ├── testCase.ts / batchRun.ts / preset.ts
│       │   ├── batchCompare.ts         # BatchCompareGroup / BatchCompareResultVO
│       │   ├── export.ts
│       │   └── variableSnapshot.ts
│       └── utils/
│           ├── variableParser.ts
│           ├── promptRenderer.ts
│           ├── tokenEstimator.ts
│           └── diff.ts
│
└── backend/
    ├── pom.xml
    ├── mvnw / mvnw.cmd
    └── src/main/
        ├── java/com/promptcraft/
        │   ├── PromptCraftApplication.java
        │   ├── config/
        │   │   ├── CorsConfig.java
        │   │   ├── AppConfig.java           # 线程池配置（sseExecutor + batchExecutor）
        │   │   ├── AutoFillHandler.java     # MyBatis-Plus 自动填充 created_at/updated_at
        │   │   └── AppProperties.java
        │   ├── controller/
        │   │   ├── ProjectController.java
        │   │   ├── PromptVersionController.java
        │   │   ├── RunController.java        # SSE 流式端点
        │   │   ├── CompareController.java
        │   │   ├── TestCaseController.java
        │   │   ├── BatchRunController.java
        │   │   ├── BatchCompareController.java # 模型对比任务
        │   │   ├── ApiPresetController.java
        │   │   ├── VariableSnapshotController.java
        │   │   ├── HealthController.java     # GET /api/health
        │   │   └── ExportController.java
        │   ├── service/
        │   │   ├── ProjectService.java
        │   │   ├── PromptVersionService.java
        │   │   ├── PromptRunService.java
        │   │   ├── CompareService.java
        │   │   ├── TestCaseService.java
        │   │   ├── BatchTestService.java
        │   │   ├── BatchCompareService.java  # 模型对比矩阵执行
        │   │   ├── ApiPresetService.java
        │   │   ├── CodeExportService.java
        │   │   ├── VariableSnapshotService.java
        │   │   └── LlmGatewayService.java
        │   ├── llm/
        │   │   ├── LlmClient.java            # 接口
        │   │   ├── LlmRequest.java / LlmResponse.java
        │   │   ├── LlmMessage.java / LlmStreamStats.java
        │   │   ├── OpenAiCompatibleClient.java
        │   │   ├── AnthropicClient.java
        │   │   ├── OllamaClient.java
        │   │   └── LlmClientFactory.java
        │   ├── entity/ dto/ vo/ enums/ mapper/ exception/
        │   └── util/
        │       ├── VariableParser.java
        │       ├── PromptRenderer.java
        │       ├── ApiKeyEncryptor.java      # AES-256-GCM
        │       └── CodeTemplateRenderer.java # Freemarker 渲染
        └── resources/
            ├── application.yml
            ├── mapper/
            └── templates/export/             # 代码导出 Freemarker 模板
                ├── python_openai.ftl
                ├── python_anthropic.ftl
                ├── typescript_openai.ftl
                └── typescript_anthropic.ftl
```

---

## 11. 部署与启动

### 11.1 前置条件

- Java 17+
- Node.js 18+
- MySQL 8.0+（用户自行安装并启动）

### 11.2 首次初始化

```bash
# 1. 克隆项目
git clone https://github.com/yourname/promptcraft-studio.git
cd promptcraft-studio

# 2. 复制本地配置文件
cp config/application-local.yml config/application-local.yml

# 3. 编辑 config/application-local.yml，填写 MySQL 连接信息
#    spring.datasource.url / username / password
#    promptcraft.app-secret（请修改为随机字符串，用于 API Key 加密）

# 4. 初始化数据库（首次运行）
mysql -u root -p < scripts/mysql/init.sql
```

### 11.3 后续启动

```bash
# Linux / macOS
./scripts/start.sh

# Windows PowerShell
.\scripts\start.ps1
```

启动成功后访问：`http://localhost:5173`

### 11.4 配置文件

​`config/application-local.yml`（本地配置，不提交 Git）：

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://127.0.0.1:3306/promptcraft?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: your_mysql_password

promptcraft:
  app-secret: your-random-secret-key-change-this   # 必须修改，用于加密 API Key
  sse:
    timeout-ms: 180000                              # SSE 超时时间（默认 180s）
    executor-core-pool-size: 10
    executor-max-pool-size: 50
  cors:
    allowed-origins:
      - http://localhost:5173
```

### 11.5 生产环境注意事项

- Nginx 反代时必须添加：`proxy_buffering off; proxy_read_timeout 300s;` 确保 SSE 不被缓冲截断
- 响应头 `X-Accel-Buffering: no` 由后端统一添加，关闭 Nginx 缓冲
- 建议生产环境启用 `useSSL=true`，并配置证书

---

## 附录：关键设计决策

|决策点|选择|原因|
| ---------------| -----------------------| --------------------------------------------------------|
|流式接收|​`fetch + ReadableStream`|Axios 不支持流，EventSource 不支持 POST|
|流式更新频率|50ms 批量 flush|每 token re-render 会卡顿，50ms ≈ 20fps，流畅且不浪费|
|SSE 超时|180s|覆盖慢速模型（本地 Ollama、长文本生成）|
|stable 真相源|​`project.stable_version_id`|避免两处字段不同步的数据一致性问题|
|API Key 加密|AES-256-GCM + 随机 IV|GCM 提供认证加密，随机 IV 防止密文重复|
|代码导出模板|Freemarker|模板可维护，比字符串拼接安全（无注入风险）|
|标签存储|​`JSON`字段|MySQL 8 原生 JSON，支持 JSON\_CONTAINS 查询|
|变量组归属|绑定 `version_id`，不跨版本|不同版本变量集合通常不一致，跨版本回放反而易出错|
|TestCase JSON 序列化|后端 `@JsonRawValue`，前端再做归一化兜底|避免 `variables_json` 被双重转义成字符串后，前端 `Object.keys` 拿到 `"0","1",...`|
|数据库容器化|不内置|降低新手环境门槛，用户自行安装 MySQL 更灵活|
|模型对比架构|BatchCompareGroup 聚合多个 BatchRun|复用 BatchRun 执行层，仅在 Group 层聚合状态和矩阵结果，避免重复实现|
|模型对比轮询|前端每 2s 轮询 GET /api/batch-compares/:id|对比任务时长不定，SSE 会因超时断连；轮询更简单且对历史结果同样适用|

```
```
