# RAG 智能问答系统

基于 Milvus + BGE-M3 + DeepSeek 的企业级 RAG（检索增强生成）系统，支持多格式文档知识库、混合检索、联网搜索、流式问答和可视化数据大盘。

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   React 18 + Ant Design 5            │
│         流式对话 / 知识库管理 / FAQ / 数据大盘          │
└────────────────────────┬────────────────────────────┘
                         │ WebSocket + REST API
┌────────────────────────▼────────────────────────────┐
│                   FastAPI (Python)                    │
│        意图识别 → 策略路由 → 检索 → 联网搜索 → 生成     │
├─────────────────────────────────────────────────────┤
│  Milvus 向量库  │  MySQL  │  Redis  │  BGE-M3 嵌入   │
│  BM25 稀疏检索  │  FAQ 存储 │ 热缓存  │  Tavily 联网   │
└─────────────────────────────────────────────────────┘
```

## 功能特性

### 智能问答
- **流式输出**：WebSocket 实时推送，打字机效果
- **意图识别**：闲聊 / 高频 FAQ / 知识检索 自动分流
- **混合检索**：Milvus 稠密向量 + BM25 稀疏检索 → RRF 融合
- **知识库模式**：一键切换为纯知识库检索，LLM 总结检索内容
- **联网搜索**：集成 Tavily API，实时搜索互联网信息增强回答
- **引用溯源**：每条回答标注检索来源和相似度分数
- **DeepSeek 驱动**：使用 DeepSeek 大模型生成回答

### 知识库管理
- **12+ 文件格式**：PDF / Word / Excel / PPT / Markdown / HTML / CSV / JSON / EPUB / 图片 OCR / 代码文件
- **父子分块**：父块 1024 tokens（LLM 上下文），子块 256 tokens（精细检索）
- **拖拽上传**：批量上传 + 索引进度追踪
- **分块可视化**：树形结构展示父子关系，支持滚轮查看完整内容

### 数据大盘
- 问答趋势图 / 意图分布饼图 / 高频 FAQ 排行
- 响应延迟监控 / 缓存命中率
- 知识库存储统计

### 界面设计
- **三栏布局**：左侧对话历史 + 中间聊天区 + 右侧引用来源
- **顶部导航栏**：对话历史 / 知识库管理 / FAQ / 数据大盘 / 系统设置
- **弹窗式功能页**：知识库、FAQ、数据大盘、系统设置以弹窗形式打开
- **欢迎屏幕**：新对话时展示系统介绍和推荐问题
- **思考动画**：AI 思考时显示弹跳圆点动画
- **深色 / 浅色双主题**：一键切换，自动持久化

## 快速开始

### 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 推荐 Anaconda |
| Node.js | 18+ | 前端构建 |
| Milvus | 2.4+ | Docker 部署 |
| MySQL | 5.6+ | 本地安装 |
| Redis | 7+ | Docker 部署 |

### 1. 启动基础服务

```bash
# Milvus Standalone (含 etcd + MinIO + Redis)
wget https://github.com/milvus-io/milvus/releases/download/v2.4.4/milvus-standalone-docker-compose.yml
docker-compose -f milvus-standalone-docker-compose.yml up -d

# 确保 MySQL 已启动，创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rag_db CHARACTER SET utf8mb4;"
```

### 2. 安装后端

```bash
cd backend
pip install -r requirements.txt

# 如果 torch 下载慢，使用国内镜像
pip install torch FlagEmbedding -i https://pypi.tuna.tsinghua.edu.cn/simple

# 编辑 config/.env 配置数据库和 API Key
# MYSQL_PASSWORD=你的密码
# LLM_API_KEY=你的DeepSeek_API_Key
# TAVILY_API_KEY=你的Tavily_API_Key（联网搜索功能，可选）

# 启动
python main.py
# 默认 http://localhost:8000 , API 文档 http://localhost:8000/docs
```

### 3. 安装前端

```bash
cd frontend
npm install
npm run dev
# 默认 http://localhost:5173
```

### 4. 使用

1. 打开 `http://localhost:5173`
2. 点击顶部导航栏「知识库管理」→ 上传文档（如 PDF）
3. 在聊天框输入问题，系统自动从知识库检索并生成回答
4. 可开启「知识库模式」或「联网搜索」切换回答方式

## 回答模式

| 模式 | 触发方式 | 说明 |
|------|---------|------|
| 普通问答 | 不开启任何开关 | 意图识别自动路由：闲聊/FAQ/知识问答 |
| 知识库模式 | 点击「知识库」按钮 | 强制走知识库检索，LLM 总结检索内容 |
| 联网搜索 | 点击「联网」按钮 | Tavily 联网搜索 + 知识库检索，合并后 LLM 生成 |
| 知识库+联网 | 同时开启两个按钮 | 两种来源同时生效 |

## 项目结构

```
RAG/
├── backend/
│   ├── config/            # Pydantic Settings 配置
│   │   ├── settings.py    # 全局配置类
│   │   └── .env           # 环境变量（数据库/API Key）
│   ├── mysql_module/      # MySQL + Redis 模块
│   │   ├── models.py      # SQLAlchemy ORM
│   │   ├── dao.py         # 异步 DAO
│   │   ├── redis_cache.py # Redis 缓存
│   │   └── bm25_scorer.py # BM25 打分
│   ├── rag_qa/            # RAG 问答核心
│   │   ├── pipeline.py    # 主流程编排
│   │   ├── intent_recognizer.py  # 意图识别
│   │   ├── strategy_selector.py  # 策略路由
│   │   ├── embedder.py    # BGE-M3 向量化
│   │   ├── milvus_store.py # Milvus 操作
│   │   ├── reranker.py    # BGE-Reranker
│   │   ├── retriever.py   # 混合检索
│   │   ├── generator.py   # LLM 生成
│   │   └── web_search.py  # Tavily 联网搜索
│   ├── offline_kb/        # 离线知识库
│   │   ├── loaders/       # 多格式文件加载器
│   │   ├── chunker.py     # 父子分块
│   │   ├── vectorizer.py  # 批量向量化
│   │   └── indexer.py     # 索引编排
│   ├── api/
│   │   ├── routes.py      # FastAPI 路由
│   │   └── schemas.py     # Pydantic 模型
│   └── main.py            # 应用入口
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Chat/          # 智能问答（主页面）
│       │   ├── KnowledgeBase/ # 知识库管理（弹窗）
│       │   ├── FAQ/           # FAQ 管理（弹窗）
│       │   ├── Dashboard/     # 数据大盘（弹窗）
│       │   └── Settings/      # 系统设置（弹窗）
│       ├── stores/        # Zustand 状态管理
│       ├── hooks/         # WebSocket
│       ├── layouts/       # 布局组件（MainLayout）
│       └── components/    # 公共组件
│
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 非流式问答 |
| WS | `/ws/chat` | WebSocket 流式问答 |
| POST | `/api/kb/upload` | 上传文档 |
| GET | `/api/kb/list` | 文档列表 |
| GET | `/api/kb/stats` | 知识库统计 |
| GET | `/api/kb/chunks/{file}` | 文件分块详情 |
| DELETE | `/api/kb/{file}` | 删除文档 |
| CRUD | `/api/faq` | FAQ 管理 |
| GET | `/api/dashboard` | 数据大盘 |
| GET/PUT | `/api/settings` | 系统设置 |

## 配置说明

编辑 `backend/config/.env`：

```env
# MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password

# Milvus
MILVUS_HOST=127.0.0.1
MILVUS_PORT=19530

# Redis
REDIS_URL=redis://127.0.0.1:6379/0

# DeepSeek LLM
LLM_API_BASE=https://api.deepseek.com
LLM_API_KEY=sk-your-api-key
LLM_MODEL=deepseek-v4-pro

# Tavily 联网搜索（可选）
TAVILY_API_KEY=tvly-your-api-key
```

## 父子分块策略

```
PDF 文档
  → 父块 (1024 tokens)：大块上下文，传给 LLM 生成
    ├─ 子块 1 (256 tokens)：精细检索粒度
    ├─ 子块 2 (256 tokens)：overlap 64 tokens
    └─ 子块 N ...
  → 检索命中子块 → 回查父块完整文本 → LLM 生成
```

## 常见问题

**Q: BGE-M3 模型加载慢？**
首次运行会自动下载模型（~2.2GB）到 `~/.cache/huggingface/`。网络不通时可设置 `HF_HUB_OFFLINE=1` 使用本地缓存，或通过 `HF_ENDPOINT=https://hf-mirror.com` 使用镜像。

**Q: Milvus 连接失败？**
确保 Docker 容器正常运行：`docker ps | grep milvus`

**Q: 上传文档提示超时？**
模型首次加载需要初始化，启动后等待 30 秒再上传。

**Q: 联网搜索不生效？**
需要在 `backend/config/.env` 中配置 `TAVILY_API_KEY`，可在 https://tavily.com 免费注册获取。
