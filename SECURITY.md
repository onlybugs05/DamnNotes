# Security Policy for DAMNNOTES

DamnNotes is an Enterprise-Grade intelligence workspace designed with a **Zero-Trust, Local-First** philosophy. We take the privacy and security of your reconnaissance data extremely seriously.

## 🛡️ Our Security Posture

### 1. Localhost Binding
The DamnNotes server strictly binds to the loopback interface (`127.0.0.1`). This means that by default, the application is **invisible to your local network (LAN)** and cannot be reached by other devices on your WiFi or Ethernet, even if you are not behind a firewall.

### 2. Zero Network Egress
DamnNotes does not include any telemetry, tracking, or remote logging. No intelligence data, notes, or terminal commands are ever transmitted to our servers or any third-party services. The tool is fully functional in **air-gapped** environments.

### 3. Path Traversal Protection
The application includes strict path normalization and boundary checking. Users cannot navigate or manipulate files outside of the designated workspace directory provided at launch.

### 4. Interactive Shell Safety
The integrated Web Terminal runs as a child process of the DamnNotes server. It is executed with the permissions of the user who launched the server. We recommend running DamnNotes as a non-privileged user.

## ⚠️ Reporting Vulnerabilities

If you are a security researcher and have discovered a vulnerability in DamnNotes, we encourage you to report it to us privately.

Please contact **onlybugs05** directly at: 
`onlybugs05@gmail.com`   For Now We are using gmail We will Upgrade soon

We will investigate all legitimate reports and provide a fix as quickly as possible. As this is a commercial product, we may offer rewards or recognition for critical security findings reported responsibly.

---
© 2026 onlybugs05. Proprietary Security Intelligence.
