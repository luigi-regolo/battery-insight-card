# Battery Insight Card

[![TikTok | Segui](assets/tiktok-segui.svg)](https://www.tiktok.com/@luigi.regolo)
[![License: GPL-3.0-only](https://img.shields.io/badge/license-GPL--3.0--only-blue?style=flat-square)](LICENSE)
[![HACS Repository](https://img.shields.io/badge/HACS-Repository-41BDF5?style=flat-square)](https://my.home-assistant.io/redirect/hacs_repository/?owner=luigi-regolo&repository=battery-insight-card&category=plugin)
[![GitHub Stars](https://img.shields.io/github/stars/luigi-regolo/battery-insight-card?style=flat-square)](https://github.com/luigi-regolo/battery-insight-card/stargazers)

## Overview

**Battery Insight Card** is a custom battery monitoring card for Home Assistant, designed with a modern, minimalist, and responsive interface inspired by the Edera Light and Graphite Dark visual styles.

It organizes battery-powered devices into customizable categories, providing an overview of battery percentages, low-battery alerts, unavailable devices, and detailed information.

The card uses Home Assistant entities already configured in the user's installation. It does not require a dedicated account, paid API, or subscription.

## Features

- **Device categories:** Eight predefined sections for Personal Devices, Motion Sensors, Doors and Windows, Other Sensors, Digital Peephole, Smart Locks, Alarm, and Radiators.
- **Custom sections:** Add, rename, reorder, and hide device categories through the visual editor.
- **Personal devices:** Monitor smartphones, tablets, and smartwatches in a dedicated section.
- **Battery levels:** Display available percentages, device counts, and the lowest numeric battery percentage in each category.
- **Battery alerts:** Visual warnings at 25% and critical indications at 10% by default, with configurable thresholds.
- **Overall summary:** Display the average battery percentage excluding Personal Devices, while continuing to include them in device counts and alerts.
- **Detailed popup:** Inspect individual battery states and filter devices by All, In Alert, or Unavailable.
- **Visual configuration:** Manage entities, sections, icons, thresholds, and appearance through the Home Assistant card editor.
- **Native icons:** Use Material Design Icons provided by Home Assistant.
- **Edera appearance:** Automatic, Light, and Dark themes with responsive layouts for desktop, tablet, and smartphone.
- **Read-only monitoring:** Display battery information without executing device commands.

Unknown and unavailable battery states are kept separate from confirmed healthy states. Compatible battery-status binary sensors can indicate low or normal battery status without providing a numeric percentage.

## Installation

### HACS

[![Open Battery Insight Card in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=luigi-regolo&repository=battery-insight-card&category=plugin)

1. Open the HACS link above in Home Assistant.
2. Follow the prompts to add the repository, if requested, and download **Battery Insight Card** through HACS.
3. Reload the Home Assistant dashboard if necessary.
4. Add **Battery Insight Card** to your dashboard and configure it through the visual editor.

### Manual installation

1. Download `dist/battery-insight-card.js` from this repository.
2. Copy the JavaScript file into the `www` directory of your Home Assistant configuration.
3. Open Home Assistant's dashboard resource management.
4. Add `/local/battery-insight-card.js` as a **JavaScript module**.
5. Reload the dashboard and add the custom card.

## Configuration / Usage

### Visual editor

Open a dashboard in edit mode, add **Battery Insight Card**, and configure the available sections:

- **Sections:** Assign battery entities, customize category names and MDI icons, and manage additional device groups.
- **Summary:** Configure low-battery and critical thresholds.
- **Appearance:** Customize the title, upper heading, and Edera theme.
- **Advanced:** Hide empty sections and control the display of unavailable device counts.

The editor uses native Home Assistant entity and icon selectors where available. No YAML is required for normal configuration.

### Battery calculations

The overall battery average uses available numeric percentage values, **excluding the predefined Personal Devices category**. Personal Devices remain included in monitored device counts and alerts.

Each category displays its lowest available numeric battery percentage, not a category average. Missing values are not estimated.

## Compatibility / Requirements

Battery Insight Card requires Home Assistant with support for custom JavaScript dashboard cards and compatible battery entities. HACS is needed only for the HACS installation method.

Numeric battery data must be provided by a compatible percentage sensor. A `binary_sensor` with `device_class: battery` can report low or normal battery status without a percentage.

No specific minimum Home Assistant version has been independently verified. The card does not depend on an external cloud service, remote JavaScript library, or installation of the Edera theme.

## Copyright & License

Copyright © 2026 luigi-regolo

Original project created and maintained by luigi-regolo.

Licensed under the **GNU General Public License, version 3 only (GPL-3.0-only)**. See [LICENSE](LICENSE) for the complete license terms.