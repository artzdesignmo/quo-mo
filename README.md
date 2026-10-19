# 澳門單據

電子報價單、發票、收據產生器。

## 本機

```bash
npm install
npm run dev
```

開 http://localhost:3000

## 匯出

填寫後輸出 JPG 或 PDF。草稿存在目前瀏覽器，匯出檔在下載資料夾。

## 上架 Vercel

1. 把這個資料夾推到 GitHub（新建一個 repo，不要公開也沒關係）。
2. 打開 [vercel.com](https://vercel.com)，用 GitHub 登入。
3. 按 **Add New… → Project**，選剛推上去的 repo。
4. Vercel 會自動偵測 Vite。確認這三項後按 Deploy：
   - Framework Preset：`Vite`
   - Build Command：`npm run build`
   - Output Directory：`dist`
5. 不需要環境變數。部署完成後會得到一個 `*.vercel.app` 網址。

之後每次 `git push` 到 GitHub，Vercel 會自動重新發布。
