# Performance Goal Tracker

A simple, private, mobile-first Progressive Web App (PWA) to track your personal performance goals over time. 

All your data is stored locally on your device. There are no servers, no tracking, and no subscriptions. It works 100% offline once installed.

## 1. Running it Locally

If you just want to preview the app on your computer before publishing:

1. You need a simple web server because Service Workers (offline support) and IndexedDB (data storage) do not work by double-clicking the `index.html` file (the `file://` protocol).
2. If you have Python installed, open your terminal/command prompt in this folder and run:
   - Windows/Linux/Mac: `python -m http.server 8000`
3. Open your browser and go to `http://localhost:8000`.

## 2. Publishing it Free

To use this on your phone, you should host it online. The app is purely static (HTML/CSS/JS), meaning you can host it for free.

**Using GitHub Pages (Easiest)**
1. Create a free GitHub account.
2. Create a new repository (e.g., `performance-tracker`).
3. Upload all the files from this folder into the repository.
4. Go to the repository **Settings** > **Pages**.
5. Under **Build and deployment**, select **Deploy from a branch** and choose the `main` or `master` branch.
6. Click **Save**. In a few minutes, your site will be live at a URL like `https://yourusername.github.io/performance-tracker/`.

**Using Cloudflare Pages (Alternative)**
1. Create a free Cloudflare account.
2. Go to **Pages** > **Create a project** > **Direct Upload**.
3. Name your project and drag this entire folder into the upload box.
4. Click **Deploy**. Your app will instantly be live at a `.pages.dev` URL.

*(Note: No matter where you host this, your performance data NEVER leaves your phone. The host only delivers the blank app files).*

## 3. Installing it on my Android Phone

1. Open **Chrome** on your Android phone.
2. Navigate to the URL where you published the app (e.g., your GitHub Pages URL).
3. Tap the **three-dot menu** in the top right corner of Chrome.
4. Tap **Add to Home screen** or **Install app**.
5. Confirm the installation.
6. The app will now appear on your phone's home screen alongside your other apps. You can launch it from there, and it will run full-screen and completely offline.

## 4. Updating the Application Later

If you make changes to the code (e.g., styling tweaks) and want to update the app on your phone:
1. Re-upload the new files to your hosting provider.
2. On your phone, open the app while connected to the internet.
3. The Service Worker will automatically detect the changes in the background and update its cache.
4. Close the app completely (swipe it away in your recents menu) and open it again to see the changes.

## 5. Backing up / Restoring my Data

Since everything is stored locally on your device, **clearing your browser data or getting a new phone will delete your goals!** 

To prevent this:
1. Open the app and go to the **Settings** tab (gear icon).
2. Tap **Export Backup**.
3. This will download a `.json` file containing all your goals and history. Save this file somewhere safe (like Google Drive or email it to yourself).
4. To restore your data on a new device, open the app, go to Settings, tap **Import Backup**, and select your saved `.json` file.
