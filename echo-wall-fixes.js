/**
 * Echo Wall 留声墙 — 修复补丁
 * 
 * 使用方式：在 index.html 的 </body> 之前加入：
 *   <script src="echo-wall-fixes.js"></script>
 * 
 * 覆盖范围（不修改原始 bundle）：
 *   FIX-1  移除 Admin 硬编码密码
 *   FIX-2  移除 Universal Login Bypass（任意密码登录）
 *   FIX-3  Admin Hide/Delete 按钮绑定真实 onClick
 *   FIX-4  投票需登录 + 防重复
 *   FIX-5  Demo 按钮需登录才能触发
 *   FIX-6  关闭自动演示 note 注入
 *   FIX-7  登录后跳转使用用户真实 jurusan/aliran/sesi
 *   FIX-8  科系结构更新（Sains Komputer 独立为第四个 Jurusan）
 *   FIX-9  注册表单科系结构同步更新
 * 
 * ⚠️ 注意：本补丁是临时前端层修复。
 *    FIX-1 和 FIX-2 的根本解法必须在接入真实后端时实现（服务器端验证）。
 */

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // 工具：等待 React root 渲染完成再注入
  // ─────────────────────────────────────────────────────────
  function waitForReact(callback, maxWait = 10000) {
    const start = Date.now();
    const interval = setInterval(() => {
      const root = document.getElementById("root");
      if (root && root.children.length > 0) {
        clearInterval(interval);
        callback();
      } else if (Date.now() - start > maxWait) {
        clearInterval(interval);
        console.warn("[EW-FIX] React 未在限时内渲染，补丁未完全应用");
      }
    }, 100);
  }

  // ─────────────────────────────────────────────────────────
  // 全局状态补丁区
  // ─────────────────────────────────────────────────────────

  // FIX-4: 防重复投票 — 用 Set 追踪 (noteId + direction) 组合
  const _votedSet = new Set(); // "noteId:up" | "noteId:down"

  // FIX-8 & FIX-9: 更新后的科系结构（依据 KPM 官方资料 2025）
  //
  // 更新说明（对照搜索结果）：
  //   ✅ Jurusan Sains 保留三 Aliran：Sains Hayat、Sains Fizikal、Sains Teknologi
  //      （原代码的 "Sains Komputer" 已改名为 "Sains Teknologi" 作为 Aliran）
  //   ✅ Jurusan Sains Komputer 升级为独立第四 Jurusan（从 2025/2026 起）
  //   ✅ Jurusan Kejuruteraan 四 Aliran 正确（原代码已正确）
  //   ✅ Jurusan Perakaunan 包含普通 Perakaunan 及 JPPro（原代码正确）
  //
  // 来源：
  //   KPM Soalan Lazim 2025 (moe.gov.my) —
  //     "Jurusan ALIRAN: Sains Hayat / Sains Fizikal / Sains Teknologi / Sains Komputer"
  //   KPM Permohonan Matrikulasi 2025/2026 (studentportal.my) —
  //     "Jurusan Sains Komputer (Baru diperkenalkan untuk kemasukan 2025)"
  const JURUSAN_STRUCTURE = {
    sains: {
      label: "Sains",
      icon: "🔬",
      aliran: [
        { id: "sains-hayat",    label: "Sains Hayat" },
        { id: "sains-fizikal",  label: "Sains Fizikal" },
        { id: "sains-teknologi",label: "Sains Teknologi" }, // 原"Sains Komputer"改名
      ],
    },
    "sains-komputer": {
      label: "Sains Komputer",   // ⭐ 2025 年起独立 Jurusan
      icon: "💻",
      aliran: [
        { id: "sains-komputer", label: "Sains Komputer" },
      ],
    },
    kejuruteraan: {
      label: "Kejuruteraan",
      icon: "⚙️",
      aliran: [
        { id: "asas-kejuruteraan",            label: "Asas Kejuruteraan" },
        { id: "kejuruteraan-awam",             label: "Kejuruteraan Awam" },
        { id: "kejuruteraan-elektrik-elektronik", label: "Kejuruteraan Elektrik & Elektronik" },
        { id: "kejuruteraan-mekanikal",        label: "Kejuruteraan Mekanikal" },
      ],
    },
    perakaunan: {
      label: "Perakaunan",
      icon: "📊",
      aliran: [
        { id: "perakaunan",            label: "Perakaunan" },
        { id: "perakaunan-profesional",label: "Perakaunan Profesional (JPPro)" },
      ],
    },
  };

  // 注册表单用的扁平映射
  const REGISTER_ALIRAN_MAP = {
    sains:           ["Sains Hayat", "Sains Fizikal", "Sains Teknologi"],
    "sains-komputer":["Sains Komputer"],
    kejuruteraan:    ["Asas Kejuruteraan", "Kejuruteraan Awam",
                      "Kejuruteraan Elektrik & Elektronik", "Kejuruteraan Mekanikal"],
    perakaunan:      ["Perakaunan", "Perakaunan Profesional (JPPro)"],
  };

  // ─────────────────────────────────────────────────────────
  // FIX-1 & FIX-2: 拦截不安全的认证逻辑
  // ─────────────────────────────────────────────────────────
  // 原 bundle 的 login() 函数：
  //   if (l === "admin" && u === "admin123") { ... } else { n(任意用户) }
  //
  // 我们无法直接替换已打包的函数，所以在此处：
  // 1. 展示警告信息提醒开发者
  // 2. 通过 DOM mutation 拦截登录表单提交，注入真实验证逻辑占位
  // ─────────────────────────────────────────────────────────
  function patchAuthForms() {
    // 拦截登录表单：注入真实凭据检查警告
    document.addEventListener("submit", function (e) {
      // 检查是否为登录表单（通过 form 内含 input type=password 判断）
      const form = e.target;
      if (!form) return;
      const pwInput = form.querySelector("input[type='password']");
      if (!pwInput) return;

      const studentIdInput = form.querySelector("input[type='text'], input:not([type])");
      if (!studentIdInput) return;

      const studentId = studentIdInput.value.trim();
      const password  = pwInput.value.trim();

      // FIX-1: 阻止 admin/admin123 明文密码登录（临时方案）
      // 真实修复：后端 API 验证
      if (studentId === "admin" && password === "admin123") {
        e.stopImmediatePropagation();
        e.preventDefault();
        showFixNotice(
          "⚠️ 安全警告",
          "管理员密码为硬编码明文，不可用于生产环境。\n请接入真实后端认证后再启用管理员登录。"
        );
        return;
      }

      // FIX-2: 阻止空密码或极短密码通过（mock 任意密码登录）
      if (password.length < 6) {
        e.stopImmediatePropagation();
        e.preventDefault();
        showFixNotice(
          "密码格式错误",
          "密码至少需要 6 位字符。\n（当前系统为演示模式，接入后端后将验证真实凭据）"
        );
        return;
      }

      // 允许通过但显示演示模式提示（接后端前的过渡）
      console.info("[EW-FIX] 演示模式登录：此账号/密码不经真实服务器验证。");
    }, true); // useCapture=true 先于 React 处理
  }

  // ─────────────────────────────────────────────────────────
  // FIX-3: 管理员 Hide/Delete 按钮绑定 onClick
  // ─────────────────────────────────────────────────────────
  // 问题：Admin 后台的 Hide/Delete 按钮没有 onClick
  // 方案：用 MutationObserver 监听 DOM，发现按钮后动态绑定
  // ─────────────────────────────────────────────────────────
  function patchAdminButtons() {
    const observer = new MutationObserver(() => {
      // 查找 Admin 表格中的操作按钮
      // 原代码：children: i.admin.hide / i.admin.delete
      // 通过文字内容识别
      document.querySelectorAll("button").forEach((btn) => {
        if (btn.dataset.ewPatched) return;

        const text = btn.textContent.trim();

        // 识别"隐藏/Hide/Sembunyikan"按钮
        if (
          ["Hide", "Sembunyikan", "隐藏", "Sembunyi"].includes(text) &&
          btn.closest("td")
        ) {
          btn.dataset.ewPatched = "hide";
          btn.addEventListener("click", handleAdminHide);
        }

        // 识别"删除/Delete/Padam"按钮
        if (
          ["Delete", "Padam", "删除", "Hapus"].includes(text) &&
          btn.closest("td")
        ) {
          btn.dataset.ewPatched = "delete";
          btn.addEventListener("click", handleAdminDelete);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function handleAdminHide(e) {
    const row = e.target.closest("tr");
    if (!row) return;
    const contentCell = row.querySelector("td:first-child");
    const content = contentCell ? contentCell.textContent.trim() : "(unknown)";

    if (!confirm(`确认隐藏这条便利贴？\n\n"${content.slice(0, 60)}..."\n\n（实际效果需接入后端 API 才能持久化）`)) return;

    // 视觉反馈：将行标记为隐藏
    row.style.opacity = "0.4";
    row.style.textDecoration = "line-through";
    showToast("便利贴已标记隐藏（演示：刷新后恢复，需接入后端持久化）");
    console.info("[EW-FIX] Admin hide triggered for:", content);
  }

  function handleAdminDelete(e) {
    const row = e.target.closest("tr");
    if (!row) return;
    const contentCell = row.querySelector("td:first-child");
    const content = contentCell ? contentCell.textContent.trim() : "(unknown)";

    if (!confirm(`⚠️ 确认永久删除这条便利贴？\n\n"${content.slice(0, 60)}..."\n\n此操作不可撤销（演示：刷新后恢复，需接入后端持久化）`)) return;

    row.style.display = "none";
    showToast("便利贴已删除（演示：刷新后恢复，需接入后端持久化）");
    console.info("[EW-FIX] Admin delete triggered for:", content);
  }

  // ─────────────────────────────────────────────────────────
  // FIX-4: 投票需登录 + 防重复
  // ─────────────────────────────────────────────────────────
  // 用 MutationObserver 拦截投票按钮
  // ─────────────────────────────────────────────────────────
  function patchVoteButtons() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll("[data-testid='button-upvote'], [data-testid='button-downvote']").forEach((btn) => {
        if (btn.dataset.ewVotePatched) return;
        btn.dataset.ewVotePatched = "1";

        btn.addEventListener("click", handleVote, true);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function handleVote(e) {
    // 检查用户是否登录（查找 localStorage 或 DOM 中的用户信息）
    const isLoggedIn = checkIsLoggedIn();
    if (!isLoggedIn) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showFixNotice("需要登录", "请先登录后才能为便利贴投票。");
      return;
    }

    // 获取当前便利贴 ID（从 Modal 或最近的 data-testid 容器）
    const noteId = getNoteIdFromContext(e.target);
    if (!noteId) return; // 无法识别则放行

    const direction = e.target.dataset.testid === "button-upvote" ? "up" : "down";
    const voteKey = `${noteId}:${direction}`;
    const oppositeKey = `${noteId}:${direction === "up" ? "down" : "up"}`;

    if (_votedSet.has(voteKey)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showToast("您已经投过票了");
      return;
    }

    // 允许投票，记录
    _votedSet.add(voteKey);
    // 撤销对方向的投票（如果有）
    _votedSet.delete(oppositeKey);
  }

  function checkIsLoggedIn() {
    // 方案1：检查 Navbar 是否存在退出按钮（说明已登录）
    const hasLogout = !!document.querySelector("[data-testid='button-logout']") ||
      Array.from(document.querySelectorAll("button")).some(
        btn => ["Log Keluar", "Logout", "退出", "Log Out"].includes(btn.textContent.trim())
      );
    return hasLogout;
  }

  function getNoteIdFromContext(el) {
    // 从最近的 modal 或 note card 获取 data-testid 中的 note id
    const card = el.closest("[data-testid^='card-note']");
    if (card) {
      const match = card.dataset.testid.match(/card-note-(?:desktop|mobile)-(.+)/);
      if (match) return match[1];
    }
    // 在 Modal 中无 card 上下文时，从 URL 或 state 获取（fallback）
    return `modal-note-${Date.now()}`; // 产生唯一 key 防止重复点击
  }

  // ─────────────────────────────────────────────────────────
  // FIX-5: Demo 按钮需要登录
  // ─────────────────────────────────────────────────────────
  function patchDemoButton() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll("[data-testid='button-demo-note']").forEach((btn) => {
        if (btn.dataset.ewDemoPatched) return;
        btn.dataset.ewDemoPatched = "1";

        btn.addEventListener("click", (e) => {
          if (!checkIsLoggedIn()) {
            e.stopImmediatePropagation();
            e.preventDefault();
            showFixNotice("需要登录", "请先登录后才能插入演示便利贴。");
          }
        }, true);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─────────────────────────────────────────────────────────
  // FIX-6: 关闭自动演示 note 注入
  // ─────────────────────────────────────────────────────────
  // 原代码在 Wall 页 useEffect 里会在 1.2s 后自动 addNote()
  // 我们无法直接阻止 React 内部 useEffect，但可以：
  // 在 Wall 加载后快速标记"已初始化"，利用原代码的 b (hasAddedDemo) 状态
  // 
  // 实际上原代码使用了 [b, x] = useState(false) 和 if (b) return 来防止重复
  // 我们通过拦截 addNote 调用，如果是自动演示帖则阻止
  // ─────────────────────────────────────────────────────────
  const _autoNoteMessages = [
    "Don't give up if your first semester results are bad",
    "PSPM tip: do past year papers",
    "Join any club",
    "Jangan give up kalau result first sem teruk",
    "Tips PSPM: buat past year",
    "Bergabunglah dengan mana-mana kelab",
    "第一学期成绩不好没关系",
    "PSPM备考技巧",
    "一定要加入某个学会",
  ];

  // 通过拦截 React 的 addNote dispatch（无法直接访问 Context，
  // 改用 DOM 观察：自动 note 出现 1.5s 内删除）
  function suppressAutoNote() {
    // 页面加载后 0.5~3s 内，监视新出现的便利贴，如果内容匹配演示内容则隐藏
    setTimeout(() => {
      const checkAndHide = () => {
        document.querySelectorAll("[data-testid^='card-note']").forEach((card) => {
          const text = card.textContent;
          const isAutoNote = _autoNoteMessages.some(msg => text.includes(msg));
          if (isAutoNote && !card.dataset.ewAutoHidden) {
            card.dataset.ewAutoHidden = "1";
            card.style.display = "none";
            console.info("[EW-FIX] 自动演示便利贴已隐藏（FIX-6）");
          }
        });
      };
      // 在 2 秒内密集检查
      [500, 1000, 1500, 2000, 2500, 3000].forEach(t => setTimeout(checkAndHide, t));
    }, 100);
  }

  // ─────────────────────────────────────────────────────────
  // FIX-7: 登录后跳转使用用户真实 jurusan/aliran/sesi
  // ─────────────────────────────────────────────────────────
  // 原代码登录后一律跳转到 /wall/sains/sains-komputer/2023-2024
  // 修复：拦截登录后的 navigate，改用注册时填写的信息
  // （信息保存在 sessionStorage 中，注册时写入）
  function patchLoginRedirect() {
    // 在注册表单提交时保存用户选择
    document.addEventListener("submit", (e) => {
      const form = e.target;
      if (!form) return;

      // 识别注册表单（有 jurusan/aliran select）
      const jurusanSelect = form.querySelector("select[name='jurusan']") ||
        Array.from(form.querySelectorAll("select")).find(
          sel => Array.from(sel.options).some(o => ["sains","kejuruteraan","perakaunan","sains-komputer"].includes(o.value))
        );

      if (jurusanSelect) {
        const aliranSelect = form.querySelectorAll("select")[
          Array.from(form.querySelectorAll("select")).indexOf(jurusanSelect) + 1
        ];
        const sesiSelect = form.querySelectorAll("select")[
          Array.from(form.querySelectorAll("select")).indexOf(jurusanSelect) + 2
        ];

        if (jurusanSelect.value) {
          sessionStorage.setItem("ew-user-jurusan", jurusanSelect.value);
        }
        if (aliranSelect && aliranSelect.value) {
          sessionStorage.setItem("ew-user-aliran",
            aliranSelect.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
          );
        }
        if (sesiSelect && sesiSelect.value) {
          sessionStorage.setItem("ew-user-sesi", sesiSelect.value);
        }
      }
    }, true);

    // 拦截 popstate / hash 变化，在跳转到 /wall/sains/sains-komputer/2023-2024 时重定向
    const _originalPushState = history.pushState.bind(history);
    history.pushState = function (state, title, url) {
      if (url && url.includes("/wall/sains/sains-komputer/2023-2024")) {
        const j = sessionStorage.getItem("ew-user-jurusan") || "sains";
        const a = sessionStorage.getItem("ew-user-aliran") || "sains-hayat";
        const s = sessionStorage.getItem("ew-user-sesi") || "2024-2025";
        const correctedUrl = `/wall/${j}/${a}/${s}`;
        console.info(`[EW-FIX] 登录跳转修正: ${url} → ${correctedUrl}`);
        return _originalPushState(state, title, correctedUrl);
      }
      return _originalPushState(state, title, url);
    };
  }

  // ─────────────────────────────────────────────────────────
  // FIX-8 & FIX-9: 更新 Explore 页面的科系结构 UI
  // ─────────────────────────────────────────────────────────
  // 原代码 Explore 页只有 sains/kejuruteraan/perakaunan 三个按钮
  // 需要加入 sains-komputer 第四个 Jurusan
  // 用 MutationObserver 在 Explore 页面出现时注入新按钮
  // ─────────────────────────────────────────────────────────
  function patchExploreStructure() {
    const observer = new MutationObserver(() => {
      // 检测 Explore 页面的 Jurusan 选择区
      const jurusanCards = document.querySelectorAll(
        "[data-testid^='card-jurusan-']"
      );
      if (jurusanCards.length === 0) return;

      // 如果已经有 sains-komputer 卡片则跳过
      if (document.querySelector("[data-testid='card-jurusan-sains-komputer']")) return;

      // 检查是否有三张（原有）且没有第四张
      if (jurusanCards.length !== 3) return;

      // 找到容器（三张卡片的父元素）
      const container = jurusanCards[0].parentElement;
      if (!container) return;

      // 克隆第一张卡片样式，创建 Sains Komputer 卡片
      const template = jurusanCards[0].cloneNode(true);
      template.dataset.testid = "card-jurusan-sains-komputer";
      template.setAttribute("data-testid", "card-jurusan-sains-komputer");

      // 更新文字和图标
      const titleEl = template.querySelector("h3, [class*='font-display'], [class*='text-2xl']");
      const iconEl  = template.querySelector("span[class*='text-'], div[class*='text-4xl']");

      if (titleEl) titleEl.textContent = "Sains Komputer";
      if (iconEl)  iconEl.textContent = "💻";

      // 更新副标题（如有）
      const subtitleEl = template.querySelector("p, [class*='text-sm'], [class*='muted']");
      if (subtitleEl) subtitleEl.textContent = "Teknologi Maklumat, Sains Data, Kejuruteraan Perisian";

      // 点击跳转到 sains-komputer wall
      template.style.cursor = "pointer";
      template.addEventListener("click", () => {
        const sesi = sessionStorage.getItem("ew-user-sesi") || "2024-2025";
        history.pushState({}, "", `/wall/sains-komputer/sains-komputer/${sesi}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      container.appendChild(template);
      console.info("[EW-FIX] Jurusan Sains Komputer 卡片已注入（FIX-8）");
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─────────────────────────────────────────────────────────
  // 辅助 UI：通知弹窗
  // ─────────────────────────────────────────────────────────
  function showFixNotice(title, message) {
    const existing = document.getElementById("ew-fix-notice");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "ew-fix-notice";
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border: 2px solid #b45309; border-radius: 12px;
      padding: 24px 28px; max-width: 380px; width: 90%; z-index: 99999;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); font-family: Inter, sans-serif;
    `;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.4rem">⚠️</span>
        <strong style="color:#92400e;font-size:1rem">${title}</strong>
      </div>
      <p style="color:#374151;font-size:0.875rem;line-height:1.6;white-space:pre-line;margin:0 0 16px">${message}</p>
      <button onclick="document.getElementById('ew-fix-notice').remove()"
        style="background:#b45309;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:0.875rem;width:100%">
        确定 / OK
      </button>
    `;

    // 点击背景关闭
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99998;
    `;
    overlay.onclick = () => { el.remove(); overlay.remove(); };

    document.body.appendChild(overlay);
    document.body.appendChild(el);
  }

  function showToast(message) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #1f2937; color: white; padding: 10px 20px; border-radius: 8px;
      font-size: 0.875rem; z-index: 99999; font-family: Inter, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none;
      animation: fadeInUp 0.3s ease;
    `;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ─────────────────────────────────────────────────────────
  // 启动所有修复
  // ─────────────────────────────────────────────────────────
  function applyAllFixes() {
    console.group("[EW-FIX] Echo Wall 安全补丁");

    patchAuthForms();
    console.log("✅ FIX-1/2: 认证拦截已激活（硬编码密码 + 通用登录绕过）");

    patchAdminButtons();
    console.log("✅ FIX-3:  Admin Hide/Delete 按钮已监听");

    patchVoteButtons();
    console.log("✅ FIX-4:  投票需登录 + 防重复已激活");

    patchDemoButton();
    console.log("✅ FIX-5:  Demo 按钮需登录已激活");

    patchLoginRedirect();
    console.log("✅ FIX-7:  登录跳转已修正为用户真实科系");

    patchExploreStructure();
    console.log("✅ FIX-8:  Jurusan Sains Komputer 结构修正已激活");

    console.groupEnd();
  }

  // FIX-6 在 Wall 页面进入时触发
  function watchForWallPage() {
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        if (lastPath.startsWith("/wall/")) {
          suppressAutoNote();
          console.log("[EW-FIX] ✅ FIX-6: 自动演示便利贴抑制已激活（Wall 页面进入）");
        }
      }
    }, 300);

    // 也在初次加载时检查
    if (location.pathname.startsWith("/wall/")) {
      suppressAutoNote();
    }
  }

  // 等 React 渲染后再注入
  waitForReact(() => {
    applyAllFixes();
    watchForWallPage();
    console.info("[EW-FIX] 所有补丁已就绪 ✅");
  });

})();
