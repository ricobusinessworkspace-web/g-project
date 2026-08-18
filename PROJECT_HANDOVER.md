# G-Project: Handover Document

Dieses Dokument dient als umfassende Übergabe für das G-Project. Es beschreibt die Architektur, die Kernmechanismen, die Datenbankstruktur und die wichtigsten (kürzlich behobenen) Besonderheiten des Systems, damit zukünftige Entwickler (oder KI-Agenten) nahtlos weiterarbeiten können.

## 1. Tech-Stack
*   **Frontend:** React, TypeScript, Vite
*   **State Management:** Zustand (`src/store/trackerStore.ts`)
*   **Backend / Database:** Supabase (PostgreSQL)
*   **Deployment:** Vercel (Auto-Deploy vom `main`-Branch)

## 2. Architektur & Paradigmen

### Event Sourcing (Das Ledger-Prinzip)
Die App basiert auf einem Single-Source-of-Truth-Prinzip. Anstatt den Punktestand einfach stumm zu überschreiben, wird **jede Aktion** (Punkte, Strafen, Resets) als separates Event in der Tabelle `tracker_action_entries` geloggt. 
*   **Vorteil:** Die Historie ist lückenlos nachvollziehbar. Die Gesamtschulden (`my_debt` / `my_total_debt`) und Punkte (`my_points`) ergeben sich rechnerisch aus der Summe dieser Events.

### Der Datenbank-Trigger (Race-Condition-Schutz)
Damit bei gleichzeitigem Drücken von Buttons (z.B. schnelles Hinzufügen von Strafen) keine veralteten Werte in die Datenbank geschrieben werden, kümmert sich ein serverseitiger PostgreSQL-Trigger um die exakte Berechnung von `my_debt` und `my_points`.
*   **Name:** `trigger_recalculate_user_stats`
*   **Funktion:** Feuert nach jedem `INSERT`, `UPDATE` oder `DELETE` in `tracker_action_entries`.
*   **Ausnahme:** Er ignoriert Events mit `rule_id = 'weekly_reset'`, da der wöchentliche Reset Schulden nur in den "Unpaid Bucket" verschiebt, das absolute Total Debt des Accounts aber in diesem Moment **nicht** ändert.

## 3. Kern-Systeme & Workflows

### A. Die Catch-Up Engine (`src/utils/catchUpEngine.ts`)
Das Herzstück der App. Sie läuft automatisch beim App-Start (`fetchState`).
*   **Aufgabe:** Simuliert die Zeit, die vergangen ist, seit der Nutzer die App zuletzt offen hatte.
*   **Daily Debt (Tägliche Steuern):** Berechnet um 04:00 Uhr morgens die Punkte-Differenz zwischen dir und dem Gegner und teilt dem Verlierer die Schulden (5€, 10€ oder 15€) zu. 
*   **Weekly Reset (Montags-Abrechnung):** Jeden Montag wird das `Weekly Debt` auf 0 gesetzt.
    *   **Positives Weekly Debt:** Wandert in den `Unpaid Bucket` (`unpaid_weekly_debt`). Von dort muss es manuell per Button bezahlt werden.
    *   **Negatives Weekly Debt (Spillover):** Wenn ein Nutzer in der Woche Überschuss erwirtschaftet (z.B. -15€), reduziert das sein *Total Debt*. Die Engine erstellt dafür ein Event namens `weekly_spillover`, welches vom DB-Trigger erfasst wird und das Total Debt permanent reduziert.

### B. TrackerStore (`src/store/trackerStore.ts`)
Verwaltet den gesamten lokalen State und die Kommunikation mit Supabase.
*   **Achtung:** Während das *Total Debt* über den DB-Trigger errechnet wird, werden **`my_weekly_debt` und `my_total_debt` direkt im Store** auf Stand gehalten und bei jedem `logAction` manuell via `UPDATE` in die Tabelle `tracker_user_stats` gepusht. (Dies war wichtig, da ein Trigger diese Werte aufgrund der komplexen Reset-Logik nicht einfach per SUM() errechnen kann).

### C. Time Machine (Retroaktives Editieren)
*   **Zweck:** Nutzer können vergangene Tage anwählen (`selectedDate` im Store) und Aktionen nachtragen.
*   **Umsetzung:** Die Funktion `logAction` nutzt nicht `Date.now()`, sondern den Timestamp des ausgewählten Datums. Die UI in `Dashboard.tsx` ändert sich, um Aktionen des vergangenen Tages statt des aktuellen anzuzeigen.

### D. "Ciad" / Remis-System
*   **Zweck:** Beide Spieler können einen Waffenstillstand (0€ Daily Tax) für den Tag vereinbaren.
*   **Umsetzung:** Spieler A triggert ein `draw_request` Event. Spieler B triggert ein `draw_accept` Event. Die Catch-Up Engine prüft auf das Vorhandensein beider Events für den spezifischen Tag und markiert den Tag intern als `isExempt = true`.

## 4. Kürzliche Bugfixes & Fallstricke (Wichtig!)

1.  **Der Weekly Spillover Bug:**
    *   *Problem:* Negatives Weekly Debt (z.B. -15€) wurde beim Montags-Reset zwar intern verbucht, aber der DB-Trigger ignorierte es (da er Reset-Events filtert). Nach einem App-Refresh war das Total Debt wieder falsch.
    *   *Lösung:* Die Catch-Up Engine erstellt bei negativem Weekly Debt nun ein **`weekly_spillover`**-Event. Dieses wird vom Trigger mitgerechnet und reduziert das Total Debt permanent.
2.  **Der Unpaid-Bucket-Transfer Bug:**
    *   *Problem:* Wenn man am Wochenende Schulden machte, wurde das `Weekly Debt` am Montag auf 0 gesetzt, wanderte aber nicht in den Unpaid Bucket. Die alten Schulden wuchsen einfach in die nächste Woche weiter.
    *   *Lösung:* `logAction` speichert nun `my_weekly_debt` bei jeder Aktion wieder verlässlich in der `tracker_user_stats`-Tabelle. So hat die Catch-Up Engine am Montag immer den topaktuellen Wert zur Hand, um ihn in den Unpaid Bucket zu transferieren.

## 5. Deployment / Arbeitsprozess
*   **Vercel Auto-Deploy:** Keine lokalen Builds pushen (z.B. in Ordner wie `dist`). Jeder Push auf den `main`-Branch (`git add . && git commit -m "..." && git push origin main`) triggert sofort den Live-Build auf Vercel.
*   **Dev-Server:** Lokal testen mit `npm run dev` (Vite).
*   **Styles:** Pures Vanilla CSS. Keine Tailwind-Klassen nutzen. UI soll hochwertig und flüssig (Animations) wirken.

## 6. Datenbank Tabellen (Zusammenfassung)
1.  **`tracker_action_entries`**: Das Ledger. Speichert jeden Klick, jedes Event (Spillover, Remis, Strafen, Punkte).
2.  **`tracker_user_stats`**: Aggregierte State-Tabelle (beinhaltet `my_points`, `my_debt`, `my_weekly_debt`, `unpaid_weekly_debt`, `last_settlement_date` etc.).
3.  **`tracker_rules`**: Definition der Buttons/Aktionen.
