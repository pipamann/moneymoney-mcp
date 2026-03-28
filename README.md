# MoneyMoney MCP Server

[![npm](https://img.shields.io/npm/v/moneymoney-mcp)](https://www.npmjs.com/package/moneymoney-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![macOS only](https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple)](https://moneymoney-app.com/)

Lass deinen KI-Assistenten deine Finanzen aus [MoneyMoney](https://moneymoney-app.com/) analysieren — Kontostände, Transaktionen, Kategorien und Portfoliodaten per natürlicher Sprache abfragen.

> **Inoffizielles Community-Projekt** — nicht von [MRH applications GmbH](https://moneymoney-app.com/impressum/) entwickelt oder unterstützt. MoneyMoney ist eine eingetragene Marke der MRH applications GmbH.

---

## Was kann man damit machen?

Einfach deinen KI-Assistenten fragen:

| Du fragst | Was passiert |
|-----------|-------------|
| *„Zeig mir meine Kontostände"* | Listet alle Konten mit Saldo und Währung auf |
| *„Wie viel habe ich im März für Lebensmittel ausgegeben?"* | Filtert Transaktionen nach Kategorie und Zeitraum |
| *„Erstelle eine Übersicht meiner Ausgaben nach Kategorie für Q1"* | Aggregiert und analysiert Transaktionsdaten |
| *„Wie hat sich mein Portfolio entwickelt?"* | Zeigt Wertpapiere und Portfoliopositionen |
| *„Vergleiche meine Ausgaben März vs. Februar"* | Analysiert Trends über Zeiträume hinweg |

---

## Schnellstart

### Voraussetzungen

- macOS (MoneyMoney ist eine reine Mac-App)
- [MoneyMoney](https://moneymoney-app.com/) installiert und geöffnet
- Node.js 18+

### Installation

Keine manuelle Installation nötig — `npx` lädt alles automatisch:

```
npx -y moneymoney-mcp
```

Oder global installieren:

```bash
npm install -g moneymoney-mcp
```

---

## Einrichtung

Wähle deinen Client und kopiere die Konfiguration:

<details>
<summary><strong>Claude Desktop</strong></summary>

Datei bearbeiten: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moneymoney": {
      "command": "npx",
      "args": ["-y", "moneymoney-mcp"]
    }
  }
}
```

Danach Claude Desktop neu starten.

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add moneymoney -- npx -y moneymoney-mcp
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Einstellungen → Features → MCP Servers → „+ Add new global MCP server":

```json
{
  "mcpServers": {
    "moneymoney": {
      "command": "npx",
      "args": ["-y", "moneymoney-mcp"]
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code / GitHub Copilot</strong></summary>

`Ctrl+Shift+P` → „Preferences: Open User Settings (JSON)":

```json
{
  "mcp": {
    "servers": {
      "moneymoney": {
        "command": "npx",
        "args": ["-y", "moneymoney-mcp"]
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

In `~/.codeium/windsurf/model_config.json`:

```json
{
  "mcpServers": {
    "moneymoney": {
      "command": "npx",
      "args": ["-y", "moneymoney-mcp"]
    }
  }
}
```

</details>

---

## Tools

| Tool | Beschreibung |
|------|-------------|
| `export_accounts` | Alle Konten mit Name, Typ, Saldo und Währung. IBANs sind standardmäßig maskiert. |
| `export_transactions` | Transaktionen mit Filtern für Konto, Kategorie, Zeitraum und Limit (Standard: 500, max: 5.000). |
| `export_categories` | Alle Transaktionskategorien als hierarchischer Baum. |
| `export_portfolio` | Wertpapiere und Portfoliopositionen, filterbar nach Konto und Anlageklasse. |

---

## Sicherheit und Datenschutz

- **Nur lesender Zugriff** — der Server kann keine Überweisungen ausführen oder Daten in MoneyMoney verändern
- **Läuft lokal auf deinem Mac** — keine Cloud, keine externe Server-Verbindung
- **IBANs standardmäßig maskiert** — vollständige Kontodaten nur auf explizite Anfrage (`includeSensitive`)
- **Open Source** — der gesamte Code ist einsehbar

---

## Entwicklung

```bash
git clone https://github.com/pipamann/moneymoney-mcp.git
cd moneymoney-mcp
npm install
npm run build
npm start
```

## Lizenz

MIT — siehe [LICENSE](LICENSE)

---

> Dieses Projekt ist ein unabhängiges Open-Source-Projekt und steht in keiner Verbindung zur MRH applications GmbH oder der Software MoneyMoney. Der Name „MoneyMoney" wird ausschließlich zur Beschreibung der Kompatibilität verwendet.
