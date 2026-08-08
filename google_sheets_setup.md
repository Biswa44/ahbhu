# AhBhu Web GIS Integration & Publishing Guide

This guide explains how to connect your Web GIS application to **Google Sheets** (for registration data), link it to your **Google Sites** homepage, and publish it on **Google Search** (so it shows up with your logo when searched).

---

## Part 1: How to Connect Google Sheets (Step-by-Step)
Browsers run websites locally and cannot directly create or write files inside your private Google Drive for security reasons. Instead, we use a **Google Apps Script** which acts as a "bridge" (API) between your website and your Google Sheet.

### Step-by-Step Setup:
1. **Create the Google Sheet**:
   - Go to [Google Sheets](https://sheets.google.com).
   - Create a **Blank Spreadsheet** named `AhBhu Registered Users`.
   - Set these column headers in row 1:
     - **Column A**: `Username`
     - **Column B**: `Contact Number`
     - **Column C**: `Mail ID`
     - **Column D**: `Date of Registration`

2. **Open Apps Script Editor**:
   - In the Google Sheets menu, click **Extensions** &rarr; **Apps Script**.
   - Delete any default code inside the editor.

3. **Paste the Script Code**:
   - Copy the JavaScript code below and paste it into the editor:
     ```javascript
     function doPost(e) {
       try {
         var data = JSON.parse(e.postData.contents);
         var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
         
         // Append: Username, Contact, Email, Date of Registration
         sheet.appendRow([
           data.username,
           data.contact,
           data.email,
           data.date
         ]);
         
         return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
                              .setMimeType(ContentService.MimeType.JSON);
       } catch (error) {
         return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                              .setMimeType(ContentService.MimeType.JSON);
       }
     }

     function doGet(e) {
       return ContentService.createTextOutput("AhBhu Google Sheets Web App Sync is Active!");
     }
     ```
   - Click the **Save** (floppy disk) icon.

4. **Deploy the Script as a Web App**:
   - Click **Deploy** &rarr; **New deployment** (top right).
   - Click the gear icon next to "Select type" and select **Web app**.
   - Set these configuration options:
     - **Description**: `AhBhu Registrations Link`
     - **Execute as**: `Me (your-email@gmail.com)`
     - **Who has access**: Choose **Anyone** (This allows your website visitors to send their registration data to the sheet).
   - Click **Deploy**.
   - Click **Authorize Access**, log in to your Google Account, click **Advanced** at the bottom, select **Go to Untitled project (unsafe)**, and select **Allow**.
   - Once completed, copy the **Web app URL** (e.g. `https://script.google.com/macros/s/XXXXX/exec`).

5. **Link it to your Code**:
   - Open [`app.js`](file:///c:/My_GIS_Site/Antigravity/app.js) in VS Code.
   - Look at line 6:
     ```javascript
     var googleAppsScriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
     ```
   - Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your copied Google Web App URL. Save the file.
   - Now, registrations will automatically save directly to your Google Sheet in your Drive!

---

## Part 2: How to Link Google Sites & Your Web GIS App
Google Sites is great for hosting static homepages, but it cannot host custom raw HTML, CSS, and JS maps as standalone responsive pages. Instead, we host the Web GIS app on a free web host and link them together:

```
                  AHBHU
                   │
          ┌────────┴────────┐
          │                 │
     Google Sites       Web GIS App
   (Main Homepage)     (Actual Workspace)
     - About AhBhu       - index.html
     - Research          - style.css
     - Contact Form      - app.js
          │                 │
          └─────── Link ────┘
```

### Option A: Redirect Link (Recommended)
1. Build your homepage on Google Sites (with sections: About, Research, Contact).
2. Add a prominent navigation button on the Google Sites menu or header called **"Launch Web GIS Map"**.
3. Link that button directly to your hosted Web GIS App URL (e.g., `https://map.ahbhu.com` or your GitHub Pages link).

### Option B: Map Embed (Directly inside Google Sites)
1. Open your Google Sites editor page.
2. Select **Insert** from the right side panel and click **Embed**.
3. Select **By URL** and paste your hosted Web GIS App URL.
4. Scale the embed window to fill the page, making it interactive directly inside your Google Sites page!

---

## Part 3: How to Publish on Google Search
Right now, your site is running on a local development address (`http://127.0.0.1:5500/`) on your computer. Google cannot see or search for files running on your private computer. To show up on Google search when searching "AhBhu", you need to **publish it on the internet** and **index it**.

### 1. Host the Code Online (For Free)
You need to put your GIS app folder (`my-gis-app` / `Antigravity`) on the internet.
- **GitHub Pages (Easiest)**:
  1. Create a free account on [github.com](https://github.com).
  2. Create a new repository named `ahbhu`.
  3. Drag and upload your `index.html`, `style.css`, `app.js`, and `assets/logo.png` files there.
  4. Go to repository **Settings** &rarr; **Pages**, select `main` branch, and click **Save**.
  5. Your site is now live at `https://<your-username>.github.io/ahbhu/`.

### 2. Connect a Custom Domain (Optional but Professional)
To make it look like a professional platform:
- Buy a domain name like `ahbhu.com` (from Google Domains, GoDaddy, Hostinger, or Namecheap).
- Link it to your GitHub Pages or Vercel site using **DNS settings** (A records / CNAME records).
- Link it to your Google Sites homepage as well.

### 3. Add Google Search Console (Crucial for Google Indexing)
To tell Google "AhBhu exists, please put it in search results":
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Enter your live website URL (e.g., `https://ahbhu.com`).
3. Verify ownership (by adding a small HTML tag we included in `<head>` or via DNS records).
4. Click **Request Indexing** on your URL.

### 4. Create a Sitemap
A sitemap helps Google's robots catalog all your pages. Create a file called `sitemap.xml` in your workspace and upload it to your host:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ahbhu.com/</loc>
    <lastmod>2026-08-09</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```
Submit this `sitemap.xml` file inside your Google Search Console panel. Google will start crawling it, and within a few days, searching "AhBhu" will show your site and logo!
