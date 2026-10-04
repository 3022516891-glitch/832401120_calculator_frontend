# 前端部署到 Vercel

前端是静态 HTML、CSS 和 JavaScript，后端单独部署在 Vercel，数据库由后端连接 PostgreSQL。前端不保存数据库密码。

1. 先部署后端，取得实际后端地址。
2. 在 js/config.js 中把 CALCULATOR_API_BASE_URL 改成 `https://实际后端地址/api`，保留 /api。线上不能使用本地 127.0.0.1。
3. 把此目录内的文件提交到单独的前端 GitHub 仓库，在 Vercel 导入仓库。Framework Preset 为 Other，无构建命令，Output Directory 为 `.`；如果仓库根就是这些文件，Root Directory 保留默认。
4. 获得前端地址后，在后端 Vercel 项目的 FRONTEND_ORIGINS 环境变量中填写它，例如 `https://实际前端地址.vercel.app`，不加路径，并重新部署后端。
5. 用无痕窗口测试计算、搜索、收藏、分页和删除，确保不需要登录 Vercel。刷新和重新部署后端后，线上历史应仍然存在。

本地联调时 js/config.js 使用 `http://127.0.0.1:8000/api`，后端默认允许 Live Server 的 5500 端口和 5173 端口。

js/config.js 是公开文件，Vercel 前端环境变量不会自动替换它。修改接口地址后需要提交并重新部署。

当前历史记录是多人共享的，不是每个用户各自的历史。全部删除会影响所有访问者的记录，仅用作作业演示，不存敏感数据。

域名不是必需的。部署可用后，可在前端项目 Settings → Domains 中添加域名并按提示配置 DNS，同时将新域名加入后端 FRONTEND_ORIGINS。详细后端步骤见后端仓库的 DEPLOYMENT.md。
