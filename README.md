# xueruo.me

Personal landing page for [xueruo.me](https://xueruo.me).

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy on Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect to Git.
2. Select repo `ViTa-Chara/xueruo-me`.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/` (repo root)
4. Deploy.

## Attach custom domain `xueruo.me`

1. Pages project → **Custom domains** → **Set up a domain** → enter `xueruo.me`.
2. If the domain is already in the same Cloudflare account, it will usually add the DNS record automatically.
3. For apex (`xueruo.me`), Cloudflare typically uses a **CNAME flattening** / Pages target. Wait for SSL to become **Active**.
4. Optional: also add `www.xueruo.me` and redirect to apex.

DNS tip: keep the domain's nameservers on Cloudflare so Pages can manage the record and issue the certificate.
