# Deployment security headers

The repository root contains `_headers`, using the format supported by Cloudflare
Pages. It applies the Content Security Policy and related response headers to every
path.

`index.html` also contains an equivalent CSP meta policy as a fallback. A meta
policy cannot enforce `frame-ancestors`, HSTS, or the other response-only headers,
so the deployment header remains the authoritative policy.

## Cloudflare Pages

No extra build step is required. Publish `_headers` with the rest of the site and
verify the deployed response with:

```powershell
curl.exe -I https://empty610.com/
```

## GitHub Pages behind Cloudflare

GitHub Pages does not interpret `_headers`. If GitHub Pages remains the origin,
create an equivalent Cloudflare **Response Header Transform Rule** for
`empty610.com/*`, copying the values from `_headers`. The CSP meta tag still
protects browsers if the edge rule is absent, but response-only protections such
as `frame-ancestors` and HSTS require the Cloudflare rule.

## Updating inline code

The policy permits inline scripts and style elements only through SHA-256 hashes.
If an inline block changes, calculate a new CSP hash and update both `index.html`
and `_headers`. Inline style attributes remain enabled because the terminal uses
runtime positioning and animation through element style properties. Inline event
handlers are prohibited.
