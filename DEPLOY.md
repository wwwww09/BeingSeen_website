# 部署指南：Supabase + Vercel

这份文档是**手把手**的。按顺序做，每一步都有「怎么验证做对了」。

整体只需要两个外部服务：

| 服务 | 作用 | 费用 |
|---|---|---|
| **Supabase** | 存留言板（Being Seen 页面的故事） | 免费版足够 |
| **Vercel** | 托管网站，自动从 GitHub 部署 | 免费版足够 |

> **重要：** 网站**不接数据库也能正常上线**。四个科学页面 + 首页完全正常，只有
> Being Seen 页面的留言框会显示「尚未连接数据库」。所以你可以先部署、后接数据库。

---

## 目录

1. [创建 Supabase 项目](#1-创建-supabase-项目)
2. [建表（执行 schema.sql）](#2-建表执行-schemasql)
3. [复制三个密钥](#3-复制三个密钥)
4. [本地写入 .env.local 并测试](#4-本地写入-envlocal-并测试)
5. [把代码推到 GitHub](#5-把代码推到-github)
6. [在 Vercel 导入仓库](#6-在-vercel-导入仓库)
7. [在 Vercel 配置环境变量](#7-在-vercel-配置环境变量)
8. [部署后验收清单](#8-部署后验收清单)
9. [常见问题](#9-常见问题)

---

## 1. 创建 Supabase 项目

1. 打开 <https://supabase.com> ，点右上角 **Start your project**。
2. 用 GitHub 账号登录（最快，不需要再记一个密码）。
3. 进入 Dashboard 后点 **New project**。
4. 填写：

   | 字段 | 填什么 |
   |---|---|
   | **Organization** | 默认的个人组织即可 |
   | **Name** | `being-seen` |
   | **Database Password** | 点 **Generate a password**，然后**复制保存到安全的地方**（后面基本用不到，但丢了很麻烦） |
   | **Region** | `Southeast Asia (Singapore)` —— 离中国大陆最近，访问最快 |
   | **Pricing Plan** | `Free` |

5. 点 **Create new project**，然后**等 1–3 分钟**（界面会显示 `Setting up project...`）。
   等它变成绿色 `Active` 再继续。

**验证：** 左侧菜单能看到 **Table Editor / SQL Editor / Project Settings** 就说明建好了。

---

## 2. 建表（执行 schema.sql）

这一步会建出 `stories` 表、开启行级安全（RLS）、加上限流触发器和实时推送。

1. 本地打开仓库里的 [`supabase/schema.sql`](supabase/schema.sql)，**全选复制**（139 行）。
2. 在 Supabase 左侧点 **SQL Editor** → **New query**。
3. 把 SQL **整段粘贴**进去，点右下角 **Run**（或按 `⌘ + Enter`）。
4. 结果面板最后一条查询会输出一行表格。

**验证：** 输出的这一行必须是

| table_name | rls_enabled | policy_count | policy_cmds |
|---|---|---|---|
| stories | **true** | **1** | **SELECT** |

- `rls_enabled = true` → 行级安全已开启
- `policy_count = 1`、`policy_cmds = SELECT` → 匿名客户端**只能读，不能写**

这三项就是安全性检查。如果不是这样，把报错信息发给我。

> 这份 SQL 可以重复执行，不会重复建表或报错。

---

## 3. 复制三个密钥

在 Supabase 左侧点 **Project Settings**（齿轮图标）→ **API Keys**。

需要复制 **3 个值**：

| # | 界面上的名字 | 在这个项目里叫什么 | 能不能公开 |
|---|---|---|---|
| 1 | **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | ✅ 可以公开 |
| 2 | **Publishable key**（旧版叫 `anon` `public`） | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ 可以公开 |
| 3 | **Secret key**（旧版叫 `service_role`） | `SUPABASE_SECRET_KEY` | ❌ **绝对不能公开** |

**验证：** URL 形如 `https://xxxxxxxxxxxx.supabase.co`；
key 形如 `sb_publishable_...` / `sb_secret_...`（新版）或 `eyJhbGciOi...`（旧版 JWT）。
两种格式本项目的代码都支持。

> ⚠️ 第 3 个 key 拥有绕过 RLS 的全部权限。它只会在 Vercel 的**服务端**环境变量里
> 使用，永远不要写进 `NEXT_PUBLIC_` 开头的变量、不要贴到聊天/截图里、不要提交到 Git。

---

## 4. 本地写入 .env.local 并测试

在**项目根目录**执行：

```bash
cp .env.example .env.local
```

然后用编辑器打开 `.env.local`，把三个值填在等号后面（**不要加引号、不要有空格**）：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxx
```

`.env.local` 已经在 `.gitignore` 里，**不会被提交**。

然后启动开发服务器：

```bash
./dev.sh dev          # macOS（自动处理 Node 签名问题）
pnpm dev              # Linux / 已经装好依赖的机器
```

打开 <http://localhost:3000/being-seen>：

**验证：** 留言板左侧的提示会从「未连接」变成
`0 of 320 stars have been lit by a story · click a dim star to leave yours`。

1. 点一颗**暗星** → 右侧输入框自动聚焦。
2. 写一句话 → 点 **Light this star**。
3. 那颗星应该立刻变成**金色**，故事出现在右侧 Stories 列表里。
4. 回到 Supabase **Table Editor → stories**，能看到这条新记录。

> **小提示：** 单击星星需要一点准头（星星很小）。如果点不中，可以直接在右侧
> 文本框里写字提交，或者用滚轮放大星图再点。
> 想换一颗星，点另一颗暗星即可。

如果第 3 步失败，跳到 [常见问题](#9-常见问题)。

---

## 5. 把代码推到 GitHub

用 GitHub Desktop：

1. 打开 GitHub Desktop，确认当前仓库是 `BeingSeen_website`。
2. 左下角 **Summary** 填一句说明，例如 `Add deployment guide and Supabase setup`。
3. 点 **Commit to main**。
4. 点顶部 **Push origin**。

**验证：** 在浏览器打开 GitHub 上的仓库页面，能看到刚才的提交，
并且文件列表里有 `DEPLOY.md`。

---

## 6. 在 Vercel 导入仓库

1. 打开 <https://vercel.com> ，用 **GitHub 账号**登录（Continue with GitHub）。
2. 点 **Add New…** → **Project**。
3. 在 **Import Git Repository** 列表里找到 `BeingSeen_website`，点 **Import**。
   - 如果列表里没有，点 **Adjust GitHub App Permissions** → 授权该仓库 → 返回。
4. 在配置页面**什么都不用改**，只要确认：

   | 字段 | 应该是 |
   |---|---|
   | Framework Preset | `Next.js`（自动识别） |
   | Root Directory | `./` |
   | Build Command | 默认（`pnpm build`） |
   | Output Directory | 默认（`.next`） |
   | Install Command | 默认（`pnpm install`） |

   > 仓库里的 `package.json` 已经写了 `"packageManager": "pnpm@11.7.0"`，
   > Vercel 会自动用 pnpm 11 安装依赖，并挑一个满足 `node >= 22` 的版本
   > （默认是 Node 22.x）。这些都不用你手动设置。

5. **先不要点 Deploy**，先去下一节填环境变量。
   （如果想先看效果，直接 Deploy 也行 —— 网站能跑，只是留言板未连接。
   之后加了环境变量再做一次 **Redeploy** 即可。）

---

## 7. 在 Vercel 配置环境变量

在刚才的导入页面（或部署后 **Settings → Environment Variables**）添加 3 条：

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | Production, Preview, Development |
| `SUPABASE_SECRET_KEY` | **Secret key** | Production, Preview, Development |

要点：

- **Name 必须一模一样**，区分大小写。
- 值**不要加引号**，前后不要有空格。
- 三条都要勾选 **Production**，否则线上留言会失败。
- `NEXT_PUBLIC_` 开头的两个变量是**构建时**内联进浏览器代码的，所以
  **每次修改这两个值都必须重新部署**（Redeploy），光改环境变量不生效。

填完后点 **Deploy**（如果已经部署过：**Deployments → ⋯ → Redeploy**，
并**取消勾选** "Use existing build cache"）。

**验证：** 部署日志最后出现 `Build Completed` 和
`Route (app)` 表格里有 `/api/stories`。

---

## 8. 部署后验收清单

打开 Vercel 给的域名（形如 `https://being-seen-xxxx.vercel.app`），逐条打勾：

**导航与页面**

- [ ] `/` 首页：有自动旋转的 3D 星场、标题 "Being Seen"、金色 `Explore the Unseen →` 按钮
- [ ] 顶部导航 5 个链接都能点，当前页面高亮
- [ ] `/lensing-supernovae`：能看到「模拟星表分布图」和可拖动的探测极限滑块
- [ ] `/lensing-frbs`：能看到 3D 光路动画和 3D FRB 天球图（可以用鼠标旋转）
- [ ] `/gravitational-wave-lensing`：拖动放大率滑块，柱状图从红变蓝、高度下降
- [ ] `/being-seen`：3D 星图可以旋转，点暗星能弹/聚焦输入框

**数据库**

- [ ] `/being-seen` 的提示不是 "not connected"，而是 `N of 320 stars…`
- [ ] 留一条测试故事 → 星星变金色 → 故事出现在右侧
- [ ] 刷新页面，故事**还在**（说明真的写进了 Supabase）
- [ ] 用另一个浏览器窗口打开同一页面，留言后**原窗口不刷新也能看到新故事**
      （这是 Supabase Realtime，如果这条失败见常见问题第 4 条）
- [ ] 测试完把测试故事删掉：Supabase → Table Editor → stories → 选中 → Delete

**安全**

- [ ] 在浏览器控制台执行下面这段，应该**报错或返回空**（匿名角色没有写权限）：

  ```js
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const c = createClient('<你的 URL>', '<你的 publishable key>')
  console.log(await c.from('stories').insert({ body: 'hack' }))
  // 期望: error.code === '42501' (permission denied for table stories)
  ```

  如果这条**成功插入**了，说明 schema.sql 没跑对，请回到第 2 步。

---

## 9. 常见问题

### 1. 留言板显示 "The guestbook is not connected yet"

浏览器里两个 `NEXT_PUBLIC_*` 变量没生效。依次检查：

1. Vercel → **Settings → Environment Variables**，Name 拼写是否完全一致。
2. 两个 `NEXT_PUBLIC_*` 是否勾选了 **Production**。
3. 改完之后**有没有重新部署**（改这两个变量必须 Redeploy 才生效）。
4. 部署到线上后按 `⌘ + Shift + R` 强制刷新，绕过缓存。

### 2. 提交后提示 "Could not save your story"

通常是服务端的 `SUPABASE_SECRET_KEY` 有问题。看 Vercel →
**Deployments → 最新一次 → Functions → /api/stories → Logs**，会看到
`[stories] insert failed:` 开头的错误：

| 日志里的关键词 | 原因 | 怎么修 |
|---|---|---|
| `relation "public.stories" does not exist` | schema.sql 没执行 | 回到第 2 步 |
| `Invalid API key` / `JWT` | Secret key 填错或填成了 publishable key | 回到第 3 步重新复制 |
| `permission denied for table stories` | 用错了 key（用了 publishable key） | 换成 **Secret key** |
| `rate limit exceeded` | 触发限流 | 正常现象，见下一条 |

### 3. 提示 "This device has reached the hourly limit"

限流生效了，说明写入是通的。每个客户端哈希**每小时最多 20 条**，
另外服务端还有**每分钟 3 条**的内存限流。等一会儿，或换个网络再试。

### 4. 别人留的言，我这边不刷新就不出现

Supabase Realtime 没开。在 **SQL Editor** 里单独执行一次：

```sql
alter publication supabase_realtime add table public.stories;
```

如果报 `already member of publication`，说明已经开了，那就是浏览器缓存问题。

> 注意：不刷新也能看到**新**故事需要 Realtime；但**页面首次加载**时已经
> 会通过普通的 SELECT 把历史故事读出来，所以刷新后一定能看到。

### 5. Vercel 构建失败

- **`pnpm install` 失败** → 检查 `pnpm-lock.yaml` 有没有提交进 Git
  （应该有的；它是锁定依赖版本用的）。
- **TypeScript 报错** → 本地跑 `./dev.sh typecheck`，把错误贴给我。
- **内存不足 / 构建超时** → 仓库里有一些体积很大的研究原始文件
  （`.fits`、`.csv`、`gISNe/` 下的 PDF）。它们和网站无关，如果构建很慢，
  可以告诉我，我把它们从 Git 跟踪里移出去（本地文件保留）。

### 6. 本地 macOS 上 `pnpm dev` 报 Team ID 错误

```
mapping process and mapped file (non-platform) have different Team IDs
```

这是 Apple 签名的 Node 和 adhoc 签名的 SWC 冲突。用 `./dev.sh dev` 代替，
它会自动做一份带 `disable-library-validation` 权限的 Node 副本。
**Vercel 上不存在这个问题**（Linux），所以不需要改任何代码。

---

## 附：本地命令速查

```bash
./dev.sh install       # 安装依赖
./dev.sh dev           # 开发服务器 http://localhost:3000
./dev.sh build         # 生产构建（和 Vercel 上跑的一样）
./dev.sh start         # 运行生产构建 http://localhost:3000
./dev.sh typecheck     # 只做类型检查
./dev.sh data          # 从原始星表重新生成 public/data 和 public/charts
./dev.sh static        # 生成纯静态 out/（拖拽上传用，可选）
./dev.sh serve-static  # 本地预览 out/（http://127.0.0.1:3200）
```

> `serve-static` 用的是项目自带的服务器（`scripts/serve-static.mjs`），
> 而不是 `python -m http.server`。原因：Next 的静态导出会为每个子页面
> 同时生成 `page.html` 和 `page/`（后者只装 RSC 载荷，没有 index.html），
> 普通静态服务器会把 `/page` 301 到 `/page/` 然后**列出文件目录**，
> 五个页面里有四个看起来像是坏的。自带服务器按托管平台的 clean URL
> 规则解析（精确文件 → `.html` → `/index.html`）。

### 推送到 GitHub 之前，建议跑一遍浏览器检查

```bash
./dev.sh build
./dev.sh start                  # 另开一个终端窗口保持运行
./dev.sh smoke                  # 第三个终端窗口
```

`./dev.sh smoke` 会用无头 Chrome 真的把五个页面打开一遍，检查两类事情：

**渲染**（每个页面）

- 有没有未捕获的 JavaScript 异常
- 有没有 `console.error`
- 每个页面的 3D 画布数量对不对、尺寸是不是 0
- 3D 场景有没有卡在加载动画上
- `<h1>` 标题是否存在
- 把视口缩到 390px 手机宽度时，页面会不会横向溢出

**交互**（这个"严肃游戏"的核心机制真的能用吗）

- 页面二的探测极限滑块：初始值是不是真实的 ZTF 极限 m = 20.5，
  读数是不是和页头结论一致（无透镜 0/5、有透镜 2/5）
- 拖动滑块后读数会不会跟着变
- 页面四的放大率滑块：能不能拖到通关（`Gap cleared`），Reset 能不能回到起点
- 页面五点星图能不能选中一颗星

**降级**（把 WebGL 关掉，每个页面再检查一遍）

- 没有 WebGL 时，正文、标题、导航栏是否还在

  这一条很重要：拿不到 WebGL 上下文时 three.js 会抛未捕获异常，React 会
  卸载整棵树 —— 五个页面里有四个会变成一张**空白错误页**。而 WebGL 不可用
  很常见：学校或公司的浏览器策略、隐私浏览器、老旧硬件、显卡驱动黑名单。
  正文才是主体，3D 是增强，不能因为增强失败就整页白屏。

全部通过会打印一串 `✓` 并返回退出码 0；任何一项失败会打印 `✗`
和具体原因，退出码 1。

**为什么需要它：** `next build` 通过 ≠ 页面能用。这个项目就出现过一次
「构建完全正常，但一打开页面整页空白」的错误（在错误的位置调用了 React
Three Fiber 的 `useFrame`），只有真的用浏览器打开才会暴露。改完 3D 或交互
相关的代码后请务必跑一遍。

如果机器上没有 Chrome，脚本会打印一行说明并跳过，不会报错。

## 附：这个项目存了什么数据

只存三样东西，**没有账号、没有姓名、没有邮箱、没有 IP**：

| 字段 | 内容 |
|---|---|
| `body` | 你写的那段文字（≤ 600 字） |
| `star_index` | 属于哪颗星（0–319） |
| `client_hash` | `IP + User-Agent` 的 SHA-256 哈希，**只用于限流**，不可逆 |

写入路径：浏览器 → `POST /api/stories`（服务端校验长度、限流）→ Supabase（secret key）。
浏览器手里的 publishable key **只能读**（数据库层 RLS + 授权双重限制），
即使有人拿到它也无法写入或篡改数据。
