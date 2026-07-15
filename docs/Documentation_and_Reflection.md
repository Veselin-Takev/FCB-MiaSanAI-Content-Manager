# Dokumentation und Reflexion

## A. Technische Dokumentation

### Architektur & Genutzte Tools
Das Projekt "FCB MiaSanKI Content Manager" ist als moderne Single-Page-Application (SPA) konzipiert. Die Systemarchitektur fokussiert sich auf schnelle Iterationen im Browser mit Anbindung an externe KI-Modelle über Server-APIs (proxied server-side API calls).

*   **Frontend-Framework:** React 18 mit TypeScript.
*   **Styling:** Tailwind CSS für ein responsives, Dark-Mode zentriertes UI-Design (angepasst an die Vereinsfarben FCB-Rot und Gold/Cyan-Akzente).
*   **Build-Tool:** Vite für schnelles Hot-Module-Replacement in der Entwicklung und optimierte Production-Builds.
*   **Icons & UI-Komponenten:** Lucide-React für konsistente Ikonografie, Framer Motion für fließende Animationen.
*   **State-Management:** React State (`useState`, `useCallback`) sowie LocalStorage für die Persistenz von Presets, Kategorien und Settings.
*   **KI-APIs & Modelle:** 
    *   *Google Gemini API (oder vergleichbare LLMs)* für Textgenerierung, Summarization und komplexe Text-Transformationen.
    *   *Web Speech API* für Client-seitiges Speech-to-Text und Text-to-Speech (Prototyping der Voice-Befehle).

### Workflow-Diagramm & Datenfluss
Der typische Workflow verläuft in folgenden Schritten:
1.  **Input-Phase:** Der Nutzer gibt Rohdaten ein (entweder als getippten Text oder via Sprachaufzeichnung).
2.  **Verarbeitung / Prompting:** 
    *   Das System zieht aus dem *Preset Manager* einen oder mehrere vorkonfigurierte KI-Prompts (Technical oder Creative).
    *   Es bildet eine *Prompt-Chain*: Zuerst wird der Text analysiert (z.B. Kernfakten extrahieren), im zweiten Schritt formatiert (z.B. in einen Tweet umwandeln) und im dritten Schritt die Tonalität appliziert.
3.  **Generierung:** Der zusammengesetzte Kontext wird an die KI-API gesendet.
4.  **Output & UI:** Die KI liefert A/B-Varianten zurück, die im Dashboard visualisiert werden. Der Nutzer kann Varianten vergleichen, editieren und als JSON/Text exportieren.

### Screenshots & Benutzeroberfläche
*   **Dashboard:** Bietet eine Split-Screen-Ansicht mit Editor auf der linken Seite und Resultat-Varianten auf der rechten Seite.
*   **Preset Manager (Sidebar):** Eine hierarchische Sidebar ermöglicht das Anlegen und Verwalten von "Technical", "Creative" und "Eigenen Bereichen" als Ordner-Baum. Drag-and-Drop ermöglicht die schnelle Reorganisation von Presets.
*   **Sparkline-Analytics:** Visualisiert die Nutzungstrends der erstellten und exportierten Inhalte über die Zeit.

### Beispiel-Prompts & Prompt-Ketten
**System-Prompt (Identität):**
`Du bist der digitale Content-Assistent des FC Bayern München. Antworte immer im respektvollen, aber selbstbewussten "Mia San Mia"-Tonfall.`

**Prompt-Kette (Beispiel Match-Report):**
*   *Schritt 1 (Extraktion):* "Lies den folgenden Spielbericht und extrahiere die 3 wichtigsten Fakten (Torschützen, Fouls, Ballbesitz)."
*   *Schritt 2 (Transformation):* "Nutze die extrahierten Fakten und generiere zwei Posts. Post A für Twitter (max. 280 Zeichen, viele Emojis). Post B für den E-Mail-Newsletter (formell, 3 Sätze)."

### Codeauszüge (Highlights)
Ein Highlight der technischen Umsetzung ist das rekursive Rendering der Sidebar-Kategorien im Preset Manager. Hier wurde eine komplexe Baumstruktur implementiert, die das Anlegen von Unterkategorien direkt aus der UI heraus erlaubt.
```tsx
const renderSidebarFolderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    return Object.values(node.subfolders).map((subfolder) => {
        // ... (Zustands-Abfragen für Expansion, Editierung) ...
        return (
            <div key={cat}>
                <div onClick={() => setExportPresetCategoryFilter(cat)}>
                    {subfolder.name}
                </div>
                {isExpanded && renderSidebarFolderNode(subfolder, depth + 1)}
            </div>
        );
    });
};
```

---

## B. Test & Evaluation

### Was hat gut funktioniert?
*   **UI-Responsiveness:** Die React-Architektur in Kombination mit Tailwind CSS hat ein sehr performantes und übersichtliches Dashboard ermöglicht. Das Umschalten zwischen dem Editor und dem Preset Manager erfolgt nahtlos.
*   **Hierarchisches Kategorie-System:** Die Umsetzung der Sidebar als rekursiver Baum hat die Usability enorm verbessert, da Nutzer nun ihre Workflows in beliebig tiefen Ordnerstrukturen ablegen können.
*   **Voice-Integration:** Die prototypische Anbindung der Web Speech API hat gezeigt, dass Sprachsteuerung (z.B. für schnelle Notizen am Spielfeldrand) ein massiver Zeitvorteil für Redakteure ist.

### Fehler, Halluzinationen & Herausforderungen
*   **Halluzinationen:** Bei der Generierung von emotionalen Posts auf Basis von spärlichen Fakten tendierte das LLM anfangs dazu, Details dazuzuerfinden (z.B. eine gelbe Karte, die nicht im Rohbericht stand). Dies erforderte eine striktere Limitierung in den Prompt-Templates (`Erfinde keine Fakten, bleibe strikt beim Input`).
*   **State-Synchronisation:** Die Synchronisierung der Baum-Datenstruktur (expanded state, active category) mit dem flachen Array im LocalStorage war technisch herausfordernd und führte anfangs zu "Geister-Ordnern", wenn Oberkategorien gelöscht wurden, ohne die Unterordner zu bereinigen.
*   **Kontext-Limit:** Bei extrem langen Text-Transkriptionen (z.B. 45-minütige Pressekonferenzen) stieß das System ohne Chunking an die Token-Limits der API, was zu unvollständigen Ergebnissen führte.

### Passung zum Use Case
Die Lösung passt hervorragend zum skizzierten Use Case. Die Kernproblematik – die zeitraubende Aufbereitung von Content in verschiedene Formate – wird durch die KI-gestützten Prompt-Ketten und die übersichtliche A/B-Ausgabe direkt adressiert. Das Tool schlägt eine Brücke zwischen technischer KI-Power und einer für Redakteure verständlichen, intuitiven Oberfläche.

---

## C. Reflexion (Erfahrungen und Learnings)

Dieses Projekt war eine intensive Auseinandersetzung mit der Integration von generativer KI in reale Arbeitsabläufe. Die initiale Annahme, dass ein simpler "Prompt-to-Text"-Ansatz ausreicht, hat sich schnell als falsch erwiesen. Ein sichtbarer Mehrwert für Nutzer (in diesem Fall Redakteure) entsteht erst, wenn das System **komplexe Automatisierungen (Prompt-Ketten)** und **Vorlagen (Presets)** anbietet, die den menschlichen Aufwand auf einen Klick reduzieren.

Ein zentrales Learning war die Wichtigkeit der **Datenstruktur im Frontend**. Die Verwaltung von dynamischen, beliebig tiefen Kategorien im Preset Manager erforderte ein solides Verständnis von rekursiven Algorithmen (dem `buildPresetTree` und `renderFolderNode`). Das direkte Editieren, Erweitern und Löschen innerhalb dieses Baumes ohne die UI zu blockieren, war eine wertvolle Lektion in React State Management.

Darüber hinaus habe ich gelernt, wie wichtig **Defensive Prompting** ist. Da LLMs von Natur aus kreativ sind, müssen die technischen Presets so konfiguriert sein, dass sie Formate strikt einhalten (z.B. JSON-Outputs für die Weiterverarbeitung in Automatisierungstools wie Zapier) und Fakten nicht verzerren. Die Integration von Audio-Elementen (Speech-to-Text) hat mir zudem gezeigt, dass Multimodalität die Einstiegshürde für KI-Tools drastisch senken kann.

Zusammenfassend hat das Projekt gezeigt: Der wahre Wert von KI im Unternehmenskontext (wie beim FC Bayern) liegt nicht im Ersetzen von Mitarbeitern, sondern im Erschaffen von intelligenten Assistenzsystemen (Co-Piloten), die manuelle Fleißarbeit übernehmen und Freiräume für strategische und wirklich kreative Entscheidungen schaffen.
