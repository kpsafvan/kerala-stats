# KSRTC Kerala Transit & Route Analytics

An interactive transit network visualization and regional mobility intelligence platform modeling Kerala State Road Transport Corporation (KSRTC & KSRTC-SWIFT) scheduled operations across Kerala and adjacent South Indian corridors.

> ⚠️ **Disclaimer:** This project is an independent, unofficial hobby experiment built strictly for educational, research, and data visualization purposes using publicly available sample data. It is **NOT** affiliated with, authorized by, or endorsed by KSRTC or the Government of Kerala. Data contains algorithmic approximations, timing discrepancies, and omissions. Do not use for real-time travel navigation. For official bookings, visit [onlineksrtcswift.com](https://onlineksrtcswift.com).

---

## 🌟 Features

- **Consecutive Road Network Routing**: Bus routes follow actual highway geometry and road curves rather than Euclidean chords, tracing consecutive intermediate stops along NH 66, NH 544, MC Road, and mountain passes.
- **Strict South Indian States Focus**: Interactive map isolates South Indian states (Kerala, Tamil Nadu, Karnataka, Andhra Pradesh, Telangana, Puducherry), masking out non-South Indian territories and other countries with an inverted polygon mask.
- **Regional Architecture**: Breakdown across:
  - **North Kerala (Malabar)**: Kasaragod, Kannur, Wayanad, Kozhikode, Malappuram, Palakkad
  - **Central Kerala**: Thrissur, Ernakulam, Idukki, Kottayam, Alappuzha
  - **South Kerala (Travancore)**: Kollam, Pathanamthitta, Thiruvananthapuram
  - **South Indian Inter-State Hubs**: Key connections in Tamil Nadu and Karnataka (Bengaluru, Mysuru, Coimbatore, Tenkasi, Kanyakumari, etc.)
- **District Flow Dynamics**: Complete mobility statistics (total daily bus volume, departures, arrivals, top transit hubs) across all 14 districts of Kerala and connected South Indian districts.
- **Interactive Map Legend & Layer Controls**:
  - Toggle route polylines and stop markers
  - One-click corridor density filtering ($\ge 25$, $15-24$, $8-14$, all)
  - Quick bounds framing for Kerala and South India
  - Permanent stop name labels and volume-scaled node sizing
- **Interactive Inspector Drawers**: Click any bus stop or highway corridor to view arriving/departing services, connected routes, and fleet categories.
- **Fleet & Hourly Analytics**: Service type distribution (Ordinary, Fast Passenger, Super Fast, Deluxe, Multi-Axle Volvo) and 24-hour departure histograms.

---

## 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Mapping**: [Leaflet](https://leafletjs.com/) with free OpenStreetMap & Esri base layers
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Deployment**: [GitHub Actions](https://github.com/features/actions) $\rightarrow$ GitHub Pages

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Local Development

1. Navigate to the web application directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`.

### Production Build

To compile TypeScript and build the optimized production assets:

```bash
cd web
npm run build
```

Assets will be output to `web/dist/`.

---

## 📄 License

This repository is licensed under the MIT License. Data used is publicly available sample schedule information.
