# Content Import — 多平台内容聚合插件

> 将各种平台的内容（文章、视频、音频、社交媒体帖子）导入 MindOS 知识库。

## 基本信息

| 字段 | 值 |
|------|---|
| ID | `content-import` |
| 类型 | Importer（导入器） |
| 来源 | 多平台官方 API / 开源爬虫 / RSS |
| 依赖 | 可选：Jina Reader API、MediaCrawler、Docker（自部署） |
| 状态 | 设计中 |

## 解决什么问题

用户散落在各平台的内容（小红书笔记、知乎回答、B站视频、Twitter 推文、RSS 文章）无法统一管理。这个插件提供一键导入，将多平台内容聚合到 MindOS 知识库。

## 支持的平台

### Phase 1：低风险平台（官方支持/开源成熟）

| 平台 | 数据类型 | 推荐方案 | 风险 |
|------|----------|----------|------|
| **RSS 订阅源** | 文章 | RSSHub + feedparser | 低 |
| **YouTube** | 视频/字幕 | yt-dlp + Data API v3 | 低 |
| **Reddit** | 帖子/评论 | PRAW (官方 API) | 低 |
| **Medium** | 文章 | RSS (`medium.com/feed/@{user}`) | 低 |
| **知乎** | 回答/文章 | RSSHub / 官方 API | 中 |
| **B站** | 视频/弹幕/评论 | bilibili-api / yt-dlp | 低-中 |

### Phase 2：中风险平台（需登录态/频率限制）

| 平台 | 数据类型 | 推荐方案 | 风险 |
|------|----------|----------|------|
| **微博** | 帖子/评论/用户 | MediaCrawler | 中 |
| **微信公众号** | 文章 | 官方 API / 浏览器插件 | 中 |
| **Twitter/X** | 推文/媒体 | twikit (内部 API) | 中-高 |
| **Bilibili** | 视频/弹幕 | bilibili-api | 低-中 |

### Phase 3：高风险平台（反爬严格/无官方 API）

| 平台 | 数据类型 | 推荐方案 | 风险 |
|------|----------|----------|------|
| **小红书** | 笔记/视频/评论 | 浏览器插件 / TikHub API | 高 |
| **豆瓣** | 图书/电影/评论 | 浏览器插件 | 高 |
| **抖音** | 视频/评论 | TikHub API (付费) | 高 |

## 功能

### 核心功能

1. **URL 导入**：用户粘贴任意平台链接，插件自动识别平台并提取内容
2. **批量订阅**：通过 RSS 订阅、关键词监控等方式批量导入
3. **定时同步**：增量同步已导入的内容（基于 lastUpdated）
4. **格式统一**：所有内容转换为 Markdown + frontmatter

### 导入模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **手动触发** | 用户粘贴 URL，点导入 | 一次性导入 |
| **RSS 订阅** | 订阅 RSS 源，定时拉取 | 持续跟踪创作者/话题 |
| **关键词监控** | 监控热搜/关键词，触发导入 | 舆情监控、竞品分析 |

### 内容处理

- **元数据提取**：标题、作者、时间、来源平台、URL、标签
- **媒体处理**：
  - 图片：下载本地化或保留 URL 引用
  - 视频：下载或仅保存元数据
  - 字幕：优先提取（如 YouTube 字幕）
- **Markdown 转换**：HTML → Markdown（使用 Turndown/Mozilla Readability）
- **去重**：基于 URL + 内容 hash 去重

## 输出格式

```markdown
---
title: "小红书笔记标题"
author: "博主昵称"
source: xiaohongshu
source_url: "https://www.xiaohongshu.com/explore/xxx"
date: 2026-05-10
tags: [旅行, 美食, 攻略]
media_type: image_post
platform: xhs
synced_at: 2026-05-10T12:00:00Z
---

# 小红书笔记标题

正文内容...

## 图片

![image1](local/path/to/image1.jpg)
![image2](local/path/to/image2.jpg)

## 互动数据

- 点赞：1.2k
- 评论：328
- 收藏：890
```

## 技术架构

### 方案选择

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Import Plugin                     │
├─────────────────────────────────────────────────────────────┤
│  URL 识别层                                                  │
│  - 平台识别（正则匹配）                                        │
│  - 内容类型识别（帖子/视频/音频/图片）                           │
├─────────────────────────────────────────────────────────────┤
│  提取引擎层                                                  │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ 官方 API     │ 开源爬虫     │ 通用提取     │              │
│  │ (PRAW,       │ (MediaCrawl  │ (Jina        │              │
│  │ bilibili-api)│ -er, yt-dlp) │ Reader)      │              │
│  └──────────────┴──────────────┴──────────────┘              │
├─────────────────────────────────────────────────────────────┤
│  格式转换层                                                  │
│  - HTML → Markdown (Turndown)                                │
│  - 元数据标准化 (frontmatter)                                 │
│  - 媒体处理 (下载/引用)                                        │
├─────────────────────────────────────────────────────────────┤
│  存储层                                                      │
│  - 输出到 <Space>/ContentImport/{platform}/                  │
│  - 支持用户自定义路径                                          │
└─────────────────────────────────────────────────────────────┘
```

### 平台适配器接口

```typescript
interface PlatformAdapter {
  // 平台标识
  readonly platform: string;
  readonly platformName: string;

  // 支持的内容类型
  readonly supportedTypes: ('article' | 'video' | 'audio' | 'image' | 'post')[];

  // 从 URL 提取内容
  async fetch(url: string, options?: FetchOptions): Promise<ImportedContent>;

  // 从 RSS 源批量导入
  async fetchFromRSS(rssUrl: string): Promise<ImportedContent[]>;

  // 增量同步（获取更新内容）
  async sync(since: Date): Promise<ImportedContent[]>;
}

interface ImportedContent {
  title: string;
  author?: string;
  date?: Date;
  content: string;           // Markdown 正文
  url: string;
  platform: string;
  mediaType: 'article' | 'video' | 'audio' | 'image' | 'post';
  metadata: Record<string, any>;  // 平台特有元数据
  media?: MediaAttachment[];
}

interface MediaAttachment {
  type: 'image' | 'video' | 'audio';
  url: string;
  localPath?: string;        // 下载后的本地路径
  thumbnail?: string;
}
```

### 推荐实现选择

| 平台 | 首选实现 | 备选实现 | 说明 |
|------|----------|----------|------|
| YouTube | yt-dlp | Data API v3 | yt-dlp 支持字幕提取 |
| Reddit | PRAW | snscrape | PRAW 官方 API，稳定 |
| Twitter | twikit | snscrape | 内部 API 免费 |
| B站 | bilibili-api | yt-dlp | API 支持弹幕/评论 |
| 微博 | MediaCrawler | weiboSpider | Playwright 方案 |
| 小红书 | TikHub API | 浏览器插件 | 官方 API 最稳定 |
| 知乎 | RSSHub | zhihu-api | RSS 无需登录 |
| 微信公众号 | 官方 API | 浏览器插件 | 需认证 |
| 通用网页 | Jina Reader | Mozilla Readability | AI 优化输出 |

## 用户界面

### Settings 配置

- **Jina Reader API Key**（可选，用于高质量提取）
- **默认存储路径**：`/ContentImport/{platform}/`
- **媒体处理**：下载本地 / 保留 URL 引用 / 跳过
- **同步频率**：手动 / 每日 / 每周

### 导入面板

```
┌────────────────────────────────────────────────────────────┐
│  Content Import                                             │
├────────────────────────────────────────────────────────────┤
│  URL: [________________________________] [导入]             │
│                                                            │
│  或选择平台：                                               │
│  [YouTube] [Reddit] [Twitter] [微博] [小红书] [知乎] ...    │
│                                                            │
│  订阅源：                                                   │
│  [+ 添加 RSS] [订阅列表] [定时同步: 关闭/每日/每周]          │
│                                                            │
│  最近导入：                                                 │
│  - YouTube 视频 "xxx" - 2分钟前                             │
│  - 知乎回答 "xxx" - 1小时前                                 │
│  - 小红书笔记 "xxx" - 3小时前                               │
└────────────────────────────────────────────────────────────┘
```

## MCP 工具

插件提供以下 MCP 工具供 Agent 调用：

```typescript
// 导入单条内容
tools.import_content({
  url: string,           // 平台 URL
  platform?: string,     // 可选，显式指定平台
  media_handling?: 'download' | 'reference' | 'skip',
})

// 批量导入（RSS）
tools.import_from_rss({
  rss_url: string,
  max_items?: number,   // 默认 20
})

// 搜索并导入
tools.search_and_import({
  platform: string,
  query: string,
  max_results?: number,
})

// 获取导入状态
tools.get_import_status({
  import_id: string,
})
```

## 实施要点

### Phase 1 实现（1-2 周）

1. 通用 URL 导入（使用 Jina Reader）
2. YouTube 视频导入（yt-dlp）
3. Reddit 帖子导入（PRAW）
4. RSS 订阅（RSSHub）

### Phase 2 实现（2-4 周）

1. B站视频/弹幕（bilibili-api）
2. 知乎（RSSHub / zhihu-api）
3. Twitter（twikit）
4. 微博（MediaCrawler）

### Phase 3 实现（4-8 周）

1. 小红书（TikHub API 或浏览器插件）
2. 微信公众号（官方 API）
3. 定时同步功能
4. 关键词监控

## 已知限制

1. **平台 API 变更**：第三方方案依赖逆向工程，平台更新可能导致失效
2. **登录态维护**：需要登录的平台（小红书、微博）cookie 会过期
3. **反爬限制**：高风险平台需要控制请求频率
4. **版权问题**：导入内容仅供个人使用，不做二次传播
5. **视频下载**：受限于平台政策和版权，内容下载应谨慎

## 相关文档

- [Media Platform Survey](../discussions/media/) - 各平台 GitHub 项目调研
- [Browser Web Clipper Survey](../refs/browser-web-clipper-survey.md) - 浏览器插件调研
- [p-readwise.md](./p-readwise.md) - Readwise 同步插件（参考格式）
- [p-notion-import.md](./p-notion-import.md) - Notion 导入插件（参考格式）