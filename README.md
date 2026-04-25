# Android Notification Payload Visualizer

This is a lightweight static web app for previewing how notification content might look in:

- an Android notification tray
- a MoEngage-style app inbox

It is designed for quick experimentation: edit only the shared title and message, and both previews update in real time.

## Run locally

You can open `index.html` directly in a browser, or serve the folder locally:

```bash
cd /Users/Ranjeet/Desktop/preview
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Exported JSON shape

The app exports the final payload in this format:

```json
{
  "campaign_name": "driver_trip_reminder",
  "users": [
    {
      "id": "",
      "app": "DriverAppAndroid"
    }
  ],
  "template": {
    "template_type": "message",
    "title": "Maximize Your Earnings Today",
    "message": "Complete more trips with Porter and boost your daily income. Check your trip opportunities now.",
    "cta_button": {
      "content": "Open App",
      "button_action": {
        "button_action_type": "deep_link",
        "link": "porter://trips"
      }
    }
  }
}
```

## Notes

- Only `template.title` and `template.message` are editable from the UI.
- The rest of the payload and preview styling stays fixed.
- `Copy JSON` and `Download Payload` always use the final payload format above.

## Assumption

The app uses fixed preview metadata to preserve the Android tray and inbox styling while you edit just the user-visible content.
