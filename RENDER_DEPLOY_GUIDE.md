# دليل نشر Osama Studio على منصة Render 🚀

تم تجهيز المشروع بالكامل لدعم النشر على منصة **Render** بخطوات بسيطة سواء عبر **Blueprint (تلقائي)** أو **يدوياً (Manual Services)**.

---

## 🌟 الطريقة الأولى: النشر التلقائي عبر Render Blueprint (الأسهل)

1. سجل الدخول إلى [dashboard.render.com](https://dashboard.render.com).
2. اضغط على زر **New +** ثم اختر **Blueprint**.
3. اختر مستودع الجيت هاب الخاص بك: `jihad2j/osama_stadio`.
4. سيتعرف Render فوراً على ملف `render.yaml` المرفق مع المشروع.
5. اضغط **Apply** وسيقوم Render ببناء:
   - خدمة **الباك اند (osama-studio-backend)** عبر Docker مع دعم كامل لـ FFmpeg.
   - خدمة **الفرونت اند (osama-studio-frontend)** عبر Node.js.

---

## 🛠️ الطريقة الثانية: النشر اليدوي (Manual Services)

إذا أردت إنشاء كل خدمة بمفردها على Render:

### 1. خادم الباك اند (Backend Web Service):
- اضغط **New +** -> **Web Service**.
- اختر مستودع `osama_stadio`.
- الإعدادات:
  - **Name:** `osama-studio-backend`
  - **Runtime:** `Docker`
  - **Dockerfile Path:** `./backend/Dockerfile`
  - **Docker Context:** `./backend`
- اضغط **Deploy Web Service**.
- بعد انتهاء البناء، انسخ الرابط الخاص به، مثلاً: `https://osama-studio-backend.onrender.com`.

### 2. واجهة الفرونت اند (Frontend Web Service):
- اضغط **New +** -> **Web Service**.
- اختر مستودع `osama_stadio`.
- الإعدادات:
  - **Name:** `osama-studio-frontend`
  - **Root Directory:** `frontend`
  - **Runtime:** `Node`
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
  - **Environment Variables:**
    - `NEXT_PUBLIC_API_URL`: ضع رابط الباك اند الذي نسخته في الخطوة السابقة (مثل `https://osama-studio-backend.onrender.com`).
- اضغط **Deploy Web Service**.

---

## ⚡ ميزة التبديل السريع من داخل التطبيق:
حتى بعد نشر الموقع، يمكنك الدخول إلى **الإعدادات (Settings)** -> تبويب **5. خادم Render / API**، ولصق رابط السيرفر والضغط على **فحص الاتصال** للربط المباشر والفوري دون أي حاجة لإعادة بناء المشروع.
