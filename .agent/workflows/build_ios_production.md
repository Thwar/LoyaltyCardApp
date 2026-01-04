---
description: Build and Submit iOS Production Release
---

1.  **Run Build Command**:
    ```bash
    eas build --platform ios --profile production
    ```
    *   Select "Yes" to handle credentials automatically if prompted.

2.  **Wait for Build**:
    *   This happens on Expo's servers. You can monitor the URL provided in the terminal.

3.  **Submit to App Store**:
    *   Once the build is complete, run:
    ```bash
    eas submit --platform ios --latest
    ```
    *   This will upload the binary to App Store Connect (TestFlight).

4.  **Verify**:
    *   Go to App Store Connect, check TestFlight, and invite testers.
