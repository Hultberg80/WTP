# CRM-System

Ett kundhanteringssystem byggt med .NET 8 Minimal API, PostgreSQL, och React.

## Projektbeskrivning

Detta CRM-system är designat för att integrera kundformulär och effektivisera kundtjänstprocesser. Systemet gör det möjligt för kunder att skapa konton, skicka meddelanden, och för kundtjänstpersonal att hantera ärenden.

### Huvudfunktioner

- **Kundkontoshantering**: Kunder kan skapa konton via e-postverifiering
- **Ärendehantering**: Kundtjänstmedarbetare kan hantera kundärenden för specifika produkter/tjänster
- **Administrationsgränssnitt**: Administratörer kan hantera produkter, tjänster och medarbetare
- **Automatiserade svar**: Första svar till kunder kan automatiseras

## Teknisk stack

- **Backend**: .NET 8 Minimal API
- **Databas**: PostgreSQL med Npgsql
- **Frontend**: React med React Router
- **E-post**: MailKit för e-postfunktionalitet

## Krav för utveckling

- .NET 8 SDK
- Node.js och npm
- PostgreSQL
- Git

## Kom igång

### Installation

1. Klona repositoryt:
   ```
   git clone https://github.com/[användarnamn]/crm-system.git
   cd crm-system
   ```

2. Konfigurera databasen:
   ```
   // Instruktioner för att konfigurera PostgreSQL-databasen
   ```

3. Installera backend-beroenden och starta API:et:
   ```
   cd backend
   dotnet restore
   dotnet run
   ```

4. Installera frontend-beroenden och starta utvecklingsservern:
   ```
   cd ../frontend
   npm install
   npm start
   ```

### Miljövariabler

Skapa en `.env`-fil i backend-katalogen med följande variabler:
```
DATABASE_CONNECTION=
MAIL_SERVER=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
```

## Projektstruktur

```
crm-system/
├── backend/               # .NET 8 Minimal API
│   ├── Controllers/       # API endpoints
│   ├── Models/            # Datamodeller
│   ├── Services/          # Affärslogik
│   └── Program.cs         # Applikationsentrypoint
├── frontend/              # React-applikation
│   ├── public/
│   └── src/
│       ├── components/    # React-komponenter
│       ├── pages/         # Sidkomponenter
│       ├── services/      # API-integrationer
│       └── App.js
└── docs/                  # Dokumentation
```

## Arbetsprocess

- Projektet utvecklas enligt SCRUM-metodik
- Vi använder Feature-by-Feature-utveckling
- Sprints varar i två veckor, med en förberedelseperiod på en vecka innan varje sprint

## Bidra till projektet

1. Skapa en ny branch för din feature: `git checkout -b feature/namn-på-feature`
2. Gör dina ändringar och commit: `git commit -m 'Lägg till funktionalitet'`
3. Pusha till branchen: `git push origin feature/namn-på-feature`
4. Skapa en Pull Request

## Teammedlemmar

- Martin Hultberg
- William Eliasson
- Shaban Suljemani
- Sigge Bratt
- Sebastian Holmberg
- Kevin Lundstedt

## Licens

Copyright © 2025 WTP
