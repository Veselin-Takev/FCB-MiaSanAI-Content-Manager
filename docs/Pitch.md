# Präsentation / Pitch: FCB MiaSanKI Content Manager

**Dauer:** 10–15 Minuten
**Format:** Live-Demo mit unterstützenden Slides/Notizen

---

## Slide 1: Titelblatt
**Titel:** FCB MiaSanKI Content Manager
**Untertitel:** Die smarte KI-Assistenz für die FC Bayern Content-Redaktion
**Speaker Notes:**
*   "Herzlich Willkommen. Ich freue mich, euch heute den FCB MiaSanKI Content Manager vorzustellen. Wir alle wissen, dass im modernen Sport-Marketing Content King ist – aber die schnelle und passgenaue Produktion für verschiedene Kanäle raubt uns oft die Zeit für echte Kreativität."

---

## Slide 2: Was ist der Use Case & Warum ist er relevant?
**Inhalt:**
*   Problem: Content-Silos, hoher manueller Aufwand bei Format-Adaptionen, Tonalitäts-Brüche.
*   Lösung: Ein zentrales Hub, das Rohdaten mit KI-Workflows in zielgruppenspezifischen Content verwandelt.
*   Relevanz: Beschleunigt Time-to-Market, sichert die einheitliche Vereins-Tonalität und entlastet das Team von repetitiven Aufgaben.
**Speaker Notes:**
*   "Jedes Wochenende produziert der Verein unzählige Bilder, Interviews und Berichte. Das Marketing-Team muss diese für Twitter, den Newsletter, die App und Sponsoren anpassen. Das kostet Stunden. Unsere Lösung ist ein KI-gestütztes Workflow-Dashboard, das diesen Prozess automatisiert und dabei die 'Mia San Mia'-DNA in jedem Post sicherstellt."

---

## Slide 3: Live-Demo
**Inhalt:** (Bildschirmteilung / App läuft)
*   Zeigen des Dashboards und der Hauptfunktionen.
*   Demonstration 1: Audio-Eingabe (Speech-to-Text) eines simulierten Trainer-Interviews.
*   Demonstration 2: Preset Manager. Zeigen der neuen Sidebar-Ordner-Struktur (Technical, Creative, Eigene Bereiche) und wie man einen Workflow zusammenstellt.
*   Demonstration 3: KI-Generierung. Anwendung eines "Social Media" Presets auf den Text, Erstellung von A/B-Varianten.
**Speaker Notes:**
*   "Ich zeige euch das System am besten live. Hier sehen wir das Dashboard. Ich starte eine Audio-Eingabe – stellt euch vor, das ist ein kurzes Voice-Memo direkt nach dem Spiel. Das System transkribiert es. Jetzt gehe ich in den Preset Manager, wo wir unsere KI-Workflows strukturiert in Ordnern ablegen können. Ich ziehe das Preset 'Emotionaler Matchday Post' auf unseren Text. Im Hintergrund startet eine Prompt-Kette, und wenige Sekunden später haben wir hier drei fertige Post-Varianten für unsere Kanäle."

---

## Slide 4: Architekturskizze & KI-Komponenten
**Inhalt:**
*   Frontend: React, Tailwind CSS, Vite (Single-Page Application).
*   KI-Komponenten:
    1.  **Speech-to-Text:** Für die Transkription der Audio-Eingaben.
    2.  **Textgenerierung (LLMs):** Google Gemini API für Transformationen, Summarization und A/B-Tests.
    3.  **Prompt-Chaining / Automatisierung:** Workflows, die komplexe Prompts verketten (z.B. erst analysieren, dann formatieren).
*   Datenhaltung: Local Storage / Local State Engine (ausbaubar auf Cloud).
**Speaker Notes:**
*   "Technisch setzen wir auf eine moderne React-Architektur. Das Herzstück sind die drei integrierten KI-Komponenten: Speech-to-Text ermöglicht die barrierefreie Eingabe. Die Textgenerierung wird von starken LLMs wie Gemini betrieben, und das Wichtigste: Wir nutzen Prompt-Chains. Das bedeutet, das System feuert nicht nur einen simplen Prompt ab, sondern verarbeitet den Text in einem automatisierten Workflow über mehrere Schritte."

---

## Slide 5: Grenzen und Risiken
**Inhalt:**
*   Daten-Halluzinationen (KI erfindet Spieler oder Spielstände).
*   Eingeschränktes Vereinswissen bei rein generischen Modellen (RAG benötigt).
*   Abhängigkeit von API-Latenzen und Token-Limits.
**Speaker Notes:**
*   "Trotz aller Euphorie müssen wir die Grenzen kennen. Die KI kann halluzinieren. Sie weiß nicht immer, wer letztes Wochenende ein Tor geschossen hat, wenn wir es ihr nicht im Kontext mitgeben. Deshalb ist das System als Co-Pilot konzipiert – der Mensch hat immer das letzte Wort, bevor etwas veröffentlicht wird."

---

## Slide 6: Vision & Realitäts-Weiterentwicklung
**Inhalt:**
*   RAG-Integration (Retrieval-Augmented Generation): Anbindung an die FCB-Datenbank für historische Statistiken.
*   Bild- & Videogenerierung: Automatische Erstellung von Highlight-Clips und Bannern basierend auf dem generierten Text.
*   Automatisierter Output: Direkte Schnittstellen (Make/Zapier) zu den Social Media Kanälen.
**Speaker Notes:**
*   "Wie geht es weiter? In Zukunft wollen wir ein RAG-System anbinden, damit die KI direkt auf die FCB-Spielerdatenbank zugreifen kann. Außerdem planen wir die Integration von Bildgenerierung, um zum Text gleich den passenden Instagram-Hintergrund zu erstellen. Und schließlich eine direkte Anbindung an Tools wie Zapier, um freigegebene Posts automatisch zu veröffentlichen. Vielen Dank!"
