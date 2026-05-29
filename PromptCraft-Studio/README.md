# PromptCraft Studio

> **Prompt's Postman + Git diff** — A prompt engineering management platform for LLM developers. Single-machine, no multi-tenancy.

---

## 核心特性

| 功能 | 说明 |
|------|------|
| **版本管理** | 对 Prompt 进行版本控制，支持 draft / stable / deprecated 状态，可视化查看 Prompt 版本 diff |
| **版本状态** | draft / stable / deprecated，支持切换稳定版本 |
| **模板变量** | 支持 `{{ variable }}` 语法，动态注入参数 |
| **流式测试** | 支持 SSE 流式推送 Prompt 测试结果，实时查看响应 |
| **模型对比** | 支持对同一 Prompt 在多个模型上的输出进行对比测试 |
| **API 预设** | 支持配置 OpenAI-Compatible / Anthropic / Ollama 等 API 预设，加密存储 API Key |
| **代码导出** | 支持生成 Python / TypeScript SDK 调用代码，一键集成 |

## 技术栈

- **后端** — Spring Boot 3.2、MyBatis-Plus、MySQL 8、Java 17
- **前端** — React 18、TypeScript、Vite、Tailwind CSS、Zustand

---

## 开发指南

### 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| JDK | 17 | 建议 Eclipse Temurin |
| Maven | 3.8 | 使用 `./mvnw` |
| Node.js | 18 | 含 npm |
| MySQL | 8.0 | |

### 1. 克隆项目

```bash
git clone https://github.com/jjsdrl1/Tool-or-Toy.git
cd Tool-or-Toy/PromptCraft-Studio
```

### 2. 初始化数据库

执行 MySQL 初始化脚本：

```bash
mysql -u root -p < scripts/mysql/init.sql
```

### 3. 配置本地环境

复制配置模板：

```bash
cp config/application-local.yml.example config/application-local.yml
```

编辑 `config/application-local.yml`，配置 MySQL 连接和 APP Secret：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/promptcraft?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root                    # 修改为你的 MySQL 用户名
    password: your_password           # 修改为你的 MySQL 密码

promptcraft:
  app-secret: change_me_to_a_32char_random_string  # 修改为随机的 32 字符字符串
```

> `config/application-local.yml` 已添加到 `.gitignore`，不会被上传。

### 4. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 5. 启动应用

**Linux / macOS：**

```bash
bash scripts/start.sh
```

**Windows PowerShell：**

```powershell
.\scripts\start.ps1
```

后端运行于 `:8081`，前端运行于 `:5173`。按 `Ctrl + C` 停止。

访问 **http://localhost:5173** 打开应用。

---

## 项目结构

```
promptcraft-studio/
├── backend/                               # Spring Boot 后端
│   ├── src/
│   └── pom.xml
├── frontend/                              # React 前端
│   ├── src/
│   └── package.json
├── config/
│   └── application-local.yml.example      # 本地配置模板
├── scripts/
│   ├── mysql/
│   │   ├── init.sql                       # 初始化数据库脚本
│   │   └── V3__add_batch_compare.sql      # 迁移脚本（可选）
│   ├── start.sh                           # 启动脚本 (Linux/macOS)
│   └── start.ps1                          # 启动脚本 (Windows)
├── docs/
│   └── architecture.md                    # 架构文档
└── README.md
```

---

## 功能说明

### API 预设

在使用前需要配置 API 预设，支持以下提供商：

- **OpenAI Compatible** — 支持 `Base URL` + `API Key` + 自定义模型，支持 DeepSeek、Qwen、Moonshot 等
- **Anthropic** — 使用 Anthropic 官方 API Key，使用 Claude 系列模型
- **Ollama** — 配置本地 Ollama 运行地址 `http://localhost:11434`，无需 API Key

### API Key 加密

`promptcraft.app-secret` 用于加密 API Key。API Key 使用 **AES-256-GCM** 加密存储，**严禁存储为明文**。修改 Secret 后，已加密的 Key 将无法解密。

---

## 常见问题

**Q: MySQL 连接失败 `Access denied for user`**  
A: 检查 `config/application-local.yml` 中的用户名和密码是否正确。

**Q: 前端页面出现 `Access denied` 或 CORS 错误**  
A: 修改 `config/application-local.yml` 中的 `promptcraft.cors.allowed-origins` 配置。

**Q: SSE 流式推送超时**  
A: 调整超时配置，SSE 默认 180 秒。若需要更长超时，修改配置：
```yaml
promptcraft:
  sse:
    timeout-ms: 300000
```

---

## License

MIT
