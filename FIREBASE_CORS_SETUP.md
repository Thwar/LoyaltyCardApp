# Firebase Storage CORS Configuration

## ✅ SOLUTION IMPLEMENTED

**The CORS issue can be resolved using Firebase emulators!** Your project is now configured to use Firebase emulators for development, which eliminates CORS issues completely.

## Quick Solution (For Immediate Use)

### Option A: Use Firebase Console (Easiest - No Java required)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `casero-app`
3. Go to Storage → Files tab
4. Click the settings menu (⋮) next to your bucket
5. Select "Edit CORS configuration"
6. Paste this configuration:

```json
[
  {
    "origin": ["http://localhost:8081", "http://localhost:3000", "http://localhost:19006", "*"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  }
]
```

### Option B: Install Java + Use Emulators (Best for Development)

#### Step 1: Install Java
Firebase emulators require Java. Install it using:

**Windows (using Chocolatey):**
```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Java
choco install openjdk11
```

**Or download manually from:**
- https://www.oracle.com/java/technologies/downloads/
- Or use OpenJDK: https://adoptium.net/

#### Step 2: Start Emulators
```bash
npm run emulators
```

#### Step 3: Start Your App
```bash
npm start
```

## What's Already Configured

Your project has been configured with:

1. **Firebase Emulators** - Local Firebase services (no CORS issues)
2. **Automatic Detection** - App uses emulators in development automatically
3. **Helpful Scripts** - `npm run emulators`, `npm run dev`

### Emulator Ports:
- **Firestore**: http://localhost:8080
- **Storage**: http://localhost:9199  
- **Firebase UI**: http://localhost:4000

## Alternative Solutions

### Option 1: Install Google Cloud SDK (Production)

#### Step 1: Install Google Cloud SDK
Download and install from: https://cloud.google.com/sdk/docs/install

For Windows, you can also use Chocolatey:
```powershell
choco install gcloudsdk
```

#### Step 2: Authenticate and Configure
```bash
gcloud auth login
gcloud config set project casero-app
```

#### Step 3: Deploy CORS configuration
```bash
gsutil cors set cors.json gs://casero-app.firebasestorage.app
```

## CORS Configuration Details
The `cors.json` file allows:
- All origins (`*`) - for development only
- All HTTP methods (GET, PUT, POST, DELETE)
- Required headers for file uploads
- 1 hour cache for preflight requests

**Note**: For production, you should restrict the origins to your actual domain instead of using `*`.
