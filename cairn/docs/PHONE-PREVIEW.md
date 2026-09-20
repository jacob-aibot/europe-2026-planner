# Open Cairn on a phone

On the same Wi-Fi as the laptop, open **http://LAPTOP-LAN-IP:5175/** in Safari or Chrome.
Include `http://` and `:5175`. This is a local preview: the laptop must remain awake with
its preview process running. Cellular or another Wi-Fi network cannot reach this address.

To rebuild and restart later, run this from `cairn/` in PowerShell:

```powershell
& .\tools\phone-preview.ps1
```

The script uses installed Node or Codex's bundled Node, regenerates the redacted example,
builds the web app, and serves only the production web directory. If the Cairn preview is
already running, it updates the build without starting another server. The port stays at
5175 rather than silently changing when busy.

If the laptop's Wi-Fi address changes, use the new Network URL shown by Vite with port 5175.
Profiles and journeys are stored per browser and URL origin. A different address or port
can therefore show an empty library; export trip backups before changing origins.

The September 14 verification confirmed HTTP 200 and browser interaction on the laptop's
LAN URL. Physical-phone connectivity is still awaiting confirmation; no hosted deployment
has been created in this pass.
