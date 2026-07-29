# FamFirst Clinic Bandar Rimbayu website prototype

A static, responsive clinic website designed for local SEO, AI answer visibility, booking conversion, a separate growth dashboard and a payment-ready checkout architecture.

## Live preview

Expected GitHub Pages URL:

`https://shukritobi.github.io/famfirst-clinic-rimbayu/`

The included workflow deploys the repository through GitHub Pages Actions. If the first workflow reports that Pages is not enabled, open repository Settings > Pages and set the source to GitHub Actions, then rerun the workflow.

## Included pages

- `index.html`: main clinic landing page
- `services/weight-management.html`: weight management SEO page
- `services/skin-tag-removal.html`: skin tag assessment SEO page
- `services/skin-health-facials.html`: skin and facial consultation SEO page
- `checkout.html`: payment-ready appointment deposit flow
- `dashboard.html`: public prototype dashboard using demo and local browser data
- `privacy.html`: privacy notice placeholder
- `robots.txt`, `sitemap.xml`, `llms.txt`: discovery files

## Confirmed public clinic details used

- FamFirst Clinic Bandar Rimbayu
- No 6-G, Jalan Flora 1/3, Bandar Rimbayu, 42500 Telok Panglima Garang, Selangor
- Main phone: 03-5525 8837
- Public email: famfirst.clinic@gmail.com
- Existing public website lists general consultation, screening, mother and child care, women’s health, vaccination, wound care and ultrasound.

Contact numbers and operating hours vary across public directories. The clinic must confirm the final phone, WhatsApp number and hours before launch.

## Proposed services that require clinic approval

The focused pages for weight management, skin tag removal, facial or skin care, vitamin D consultation and loose or excess skin concerns are strategic proposals based on the brief. Before public launch, confirm:

1. The service is currently offered.
2. The clinic registration and physical facilities permit it.
3. The practitioner has the required training, credentialing and privileging.
4. The equipment and treatment wording are accurate.
5. Any required Medicine Advertisements Board approval is obtained.
6. Fees, deposits, refund rules and treatment exclusions are approved.

## Activate the payment gateway

GitHub Pages cannot safely store payment API keys or receive payment callbacks. The `worker/` folder contains a Cloudflare Worker and D1 starter that:

- saves appointment leads
- creates Billplz bills
- redirects patients to the hosted payment page
- verifies Billplz HMAC-SHA256 X Signature callbacks
- records payment status
- exposes a token-protected dashboard endpoint

### Setup outline

1. Create a Billplz sandbox account and collection.
2. Create a Cloudflare D1 database.
3. Copy `worker/wrangler.jsonc.example` to `worker/wrangler.jsonc`.
4. Add the D1 database ID and Worker URLs.
5. Run the SQL schema against D1.
6. Add secrets with Wrangler, never commit them:
   - `BILLPLZ_API_KEY`
   - `BILLPLZ_COLLECTION_ID`
   - `BILLPLZ_XSIGNATURE_KEY`
   - `DASHBOARD_TOKEN`
7. Deploy the Worker.
8. Put the Worker URL inside the `famfirst-api` meta tag in `index.html`, `checkout.html` and service pages.
9. Test Billplz sandbox creation, redirect, callback verification and reconciliation before switching to production.

## Dashboard security

`dashboard.html` is intentionally a public prototype. It shows browser-local demo data and does not provide real authentication. A production dashboard should be private, fetch data from the Worker with staff authentication, log access and avoid exposing patient medical notes in analytics screens.

## SEO and AISEO launch checklist

- Replace prototype brand mark with the clinic’s approved logo.
- Add original clinic and doctor photographs with written permission.
- Confirm doctor profiles and current APC details.
- Add a named medical reviewer and review date to every health article.
- Connect the final custom domain and update canonical URLs, sitemap and schema.
- Set up Google Business Profile, Search Console, GA4 and conversion events.
- Publish two doctor-reviewed articles per month around local patient questions.
- Build genuine local citations and request reviews without incentives.
- Avoid guaranteed results, unsupported superlatives, misleading before-and-after content or medicine claims.

## Local development

Any static server works. Example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.
