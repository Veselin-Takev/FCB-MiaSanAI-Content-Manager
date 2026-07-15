# Use Case: FCB MiaSanKI Content Manager

## 1. Welches echte Problem löst die App?
In großen Sportvereinen wie dem FC Bayern München entsteht täglich eine enorme Menge an multimedialen Inhalten – von Spielzusammenfassungen über Interviews und Trainingsberichten bis hin zu Fan-Aktionen. Das Marketing- und Redaktionsteam steht vor der Herausforderung, diese Inhalte effizient, konsistent und zielgruppengerecht für verschiedene Kanäle (Social Media, Newsletter, Website, Stadion-Screens) aufzubereiten. 
Das manuelle Anpassen von Tonalität, Format und Metadaten kostet viel Zeit und ist fehleranfällig. Zudem mangelt es oft an einer zentralen Übersicht und einheitlichen Workflows, um beispielsweise aus einem langen Textinterview automatisch kurze Social-Media-Snippets, einen Newsletter-Teaser und Metadaten-Tags zu generieren.

**Lösung:** Der *FCB MiaSanKI Content Manager* löst dieses Problem, indem er einen KI-gestützten, zentralisierten Workflow anbietet. Er automatisiert die Analyse von Rohdaten (Text, Audio), wendet vordefinierte (oder custom) Marken-Presets an und generiert kanal- und zielgruppenspezifischen Content.

## 2. Für wen ist die App (Zielgruppe)?
Die Anwendung richtet sich primär an interne Stakeholder des FC Bayern München:
*   **Marketing- & Social Media-Team:** Zur schnellen Aufbereitung von Posts, Tweets und Stories mit einheitlicher Vereins-Tonalität.
*   **Redakteure & Content Creator:** Als Assistenzsystem, um Entwürfe für Artikel, Newsletter und Presseberichte zu erstellen oder zusammenzufassen.
*   **Audio/Video-Produzenten:** Zur schnellen Transkription von Sprachnachrichten/Interviews (Speech-to-Text) und anschließenden Kategorisierung.
*   **Übergreifend:** Kampagnen-Manager, die durch Automatisierung und A/B-Varianten-Generierung effizienter arbeiten möchten.

## 3. Warum ist KI hier sinnvoll?
KI ist der entscheidende Hebel, da das System nicht nur starre Regeln anwendet, sondern Kontexte verstehen und kreativ verarbeiten muss:
*   **Semantisches Verständnis:** Die KI kann aus einem rohen Spielbericht die wichtigsten Highlights extrahieren und umschreiben.
*   **Skalierbare Personalisierung:** Durch komplexe Prompt-Ketten (z.B. erst Zusammenfassen, dann in verschiedene Tonalitäten übersetzen) können auf Knopfdruck Varianten für unterschiedliche Fan-Segmente (z.B. sachlich für Pressemitteilungen, emotional für Social Media) erzeugt werden.
*   **Multimodale Verarbeitung:** KI ermöglicht es, unstrukturierte Daten (wie ein aufgezeichnetes Sprachmemo) in strukturierte Inhalte (Text, Metadaten, Tags) zu transformieren.
*   **Effizienz:** Was manuell Stunden dauert, wird auf Sekunden reduziert. Die Mitarbeiter können sich auf die finale Qualitätskontrolle und Strategie konzentrieren.

## 4. Welche Daten, Dokumente oder Eingaben benötigt das System?
Um effektiv zu arbeiten, benötigt das System folgende Eingaben:
*   **Rohdaten (Input):** Rohtexte (z.B. Match-Reports, Pressemitteilungen, Notizen), Sprachaufnahmen/Audio-Files (für Speech-to-Text) oder externe Links zu relevanten Vereinsnews.
*   **Konfigurationen (Presets):** Zielgruppen-Definitionen, Tonalitätsvorgaben (z.B. "Mia San Mia", "Emotional", "Taktisch"), Kanal-Formate (Twitter-Länge, Newsletter-Format) und Metadaten (Saison, Spieltag).
*   **Prompt-Templates:** Die durch den Nutzer angelegten Workflows und technischen/kreativen Prompt-Vorlagen, die in der App verwaltet werden.

## 5. Einschränkungen und Risiken (Datenschutz, API, etc.)
*   **Datenschutz (DSGVO):** Da potenziell interne oder vertrauliche Strategiepapiere und Interviews verarbeitet werden, muss sichergestellt sein, dass die an die KI-APIs (wie Google Gemini) gesendeten Daten nicht zum Training öffentlicher Modelle verwendet werden (Enterprise-Lizenzen notwendig).
*   **Halluzinationen:** LLMs können Fakten erfinden (z.B. falsche Spielstände oder Spielernamen). Eine menschliche Endkontrolle (Human-in-the-Loop) bleibt im Workflow zwingend erforderlich, daher fungiert das Tool als Assistenzsystem, nicht als vollautonomer Publisher.
*   **Abhängigkeit von APIs:** Das System ist von der Verfügbarkeit externer KI-Schnittstellen (Google Gemini API, TTS/STT Dienste) abhängig. Bei Netzwerkausfällen oder Rate Limits der APIs kann die Content-Generierung pausieren.
*   **Marken-Authentizität:** Die feinen Nuancen der Vereinsphilosophie ("Mia San Mia") sind für generische Modelle schwer exakt zu treffen; das System bedarf kontinuierlicher Prompt-Optimierung und spezifischer System-Instructions, um authentisch zu bleiben.
