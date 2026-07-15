// Default knowledge corpus for the RAG vector store. Indexing this content via
// POST /api/rag/seed makes the retrieval (and therefore the multi-agent QA
// pipeline) immediately effective. The entries are brand/style guidance and
// stable club facts; example content is labelled as such and contains no
// invented match results presented as truth.

export interface SeedDocument {
  source: string;
  content: string;
  meta?: Record<string, unknown>;
}

export const FCB_KNOWLEDGE_SEED: SeedDocument[] = [
  {
    source: "tone-of-voice-guide",
    meta: { type: "guideline" },
    content: `FC Bayern Tone-of-Voice-Leitfaden. Die Kommunikation ist selbstbewusst, nahbar und stets faktisch korrekt. Kernwert ist das Vereinsmotto "Mia San Mia" – es steht für Zusammenhalt, Stolz und Bodenständigkeit. Der Ton ist enthusiastisch, aber niemals überheblich gegenüber Gegnern. Fans werden als "Familie" adressiert. Es werden keine unbelegten Behauptungen aufgestellt; im Zweifel wird auf gesicherte Fakten zurückgegriffen. Emotion und Respekt stehen im Gleichgewicht.`,
  },
  {
    source: "brand-guidelines",
    meta: { type: "guideline" },
    content: `Markenrichtlinien. Primärfarben sind FCB-Rot und Weiß. Das Motto "Mia San Mia" soll in offiziellen Kampagnen präsent sein. Offizielle Hashtags sind #MiaSanMia und #FCBayern; kampagnenspezifische Tags werden ergänzt. Geschützte Logos, Sponsoren-Brandings und Spielerbildrechte dürfen nicht durch generative Modelle verfälscht werden. Visuelle KI-Inhalte werden auf symbolische, atmosphärische Motive beschränkt.`,
  },
  {
    source: "channel-style-matrix",
    meta: { type: "guideline" },
    content: `Kanal-Stilmatrix. Instagram: maximal ca. 150 Zeichen, visuelle Hook zuerst, Emojis erwünscht, maximal 2 Hashtags. LinkedIn: bis ca. 700 Zeichen, professioneller Ton, keine Emojis, kein Hashtag-Fokus. YouTube: dynamisches Skript mit Hook (0–15 Sekunden), etwa 90 Sekunden Erzählung und klarem Call-to-Action. TikTok/Reels: jugendlich, hook-first, hohe Energie.`,
  },
  {
    source: "club-facts",
    meta: { type: "fact" },
    content: `Stabile Vereinsfakten. Der FC Bayern München wurde im Jahr 1900 gegründet. Die Heimspielstätte ist die Allianz Arena in München mit einer Kapazität von rund 75.000 Zuschauern. Der Verein zählt zu den erfolgreichsten und mitgliederstärksten Fußballklubs der Welt mit einer global verteilten Fangemeinde in Europa, Asien und Amerika.`,
  },
  {
    source: "sponsor-communication-policy",
    meta: { type: "policy" },
    content: `Sponsoren-Kommunikationsrichtlinie. Sponsoren werden ausschließlich gemäß den vertraglich vereinbarten Platzierungs- und Nennungsregeln erwähnt. Vor der Veröffentlichung sind Sichtbarkeit von Sponsor-Logos und bindende rechtliche Klauseln zu prüfen. Es werden keine Produktversprechen oder Leistungsdaten von Sponsoren erfunden.`,
  },
  {
    source: "match-report-template",
    meta: { type: "template", note: "Format-Vorlage, kein reales Ergebnis" },
    content: `Beispiel-Format für einen Spielbericht (Vorlage, keine realen Ergebnisse): Einleitung mit Paarung und Wettbewerb; Kernfakten (Ergebnis, Torschützen mit Minute, Zuschauerzahl); ein bis zwei taktische Beobachtungen; abschließendes emotionales Fazit im "Mia San Mia"-Ton. Sämtliche Zahlen sind aus den gelieferten Kerndaten zu übernehmen und niemals zu erfinden.`,
  },
];
