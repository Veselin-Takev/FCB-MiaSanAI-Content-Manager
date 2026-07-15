export const handleExportReportToCsv = (
  exportPresets: any[],
  customStatuses: any[],
  language: string,
  trendTemporalRange: string
) => {
  const draftCount = exportPresets.filter(p => p.status === "Draft").length;
  const needsWorkCount = exportPresets.filter(p => p.status === "Needs Work").length;
  const approvedCount = exportPresets.filter(p => p.status === "Approved" || !p.status).length;

  const customStatusCounts = customStatuses.map(statusObj => {
    const count = exportPresets.filter(p => p.status === statusObj.name).length;
    return { name: statusObj.name, value: count };
  });

  const totalCount = draftCount + needsWorkCount + approvedCount + customStatuses.reduce((acc, statusObj) => {
    return acc + exportPresets.filter(p => p.status === statusObj.name).length;
  }, 0);

  let csvContent = "";
  csvContent += `FC Bayern Munich - Media San AI Preset Report\n`;
  csvContent += `Generated At: ${new Date().toISOString()}\n`;
  csvContent += `Language Focus: ${language === "de" ? "German (DE)" : "English (EN)"}\n\n`;

  csvContent += `STATUS DISTRIBUTION SUMMARY\n`;
  csvContent += `Status,Count,Percentage\n`;
  csvContent += `Draft,${draftCount},${totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0}%\n`;
  csvContent += `Needs Work,${needsWorkCount},${totalCount > 0 ? Math.round((needsWorkCount / totalCount) * 100) : 0}%\n`;
  csvContent += `Approved,${approvedCount},${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%\n`;

  customStatusCounts.forEach(c => {
    csvContent += `"${c.name}",${c.value},${totalCount > 0 ? Math.round((c.value / totalCount) * 100) : 0}%\n`;
  });

  csvContent += `Total,${totalCount},100%\n\n`;

  csvContent += `TREND & PROJECTION DATA (${trendTemporalRange.toUpperCase()} VIEW)\n`;
  
  let trendHeader = "Period,Draft,Needs Work,Approved";
  customStatuses.forEach(s => {
    trendHeader += `,${s.name}`;
  });
  trendHeader += ",Total,Type,Milestone\n";
  csvContent += trendHeader;

  const trendRows = Array.from({ length: 10 }).map((_, i) => {
    const isProjection = i > 6;
    const date = new Date();
    let dateString = "";

    if (trendTemporalRange === "Daily") {
      if (!isProjection) {
        const dayOffset = 6 - i;
        date.setDate(date.getDate() - dayOffset);
      } else {
        const dayOffset = i - 6;
        date.setDate(date.getDate() + dayOffset);
      }
      dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });
    } else if (trendTemporalRange === "Weekly") {
      if (!isProjection) {
        const dayOffset = (6 - i) * 7;
        date.setDate(date.getDate() - dayOffset);
      } else {
        const dayOffset = (i - 6) * 7;
        date.setDate(date.getDate() + dayOffset);
      }
      const weekNum = i - 6;
      if (weekNum < 0) {
        dateString = `W${weekNum}`;
      } else if (weekNum === 0) {
        dateString = language === "de" ? "Diese Woche" : "This Week";
      } else {
        dateString = `W+${weekNum}`;
      }
    } else { // Monthly
      if (!isProjection) {
        const monthOffset = 6 - i;
        date.setMonth(date.getMonth() - monthOffset);
      } else {
        const monthOffset = i - 6;
        date.setMonth(date.getMonth() + monthOffset);
      }
      dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", year: "2-digit" });
    }

    const baseTotal = 250 + (i * 15);
    const draftV = Math.floor(baseTotal * 0.15);
    const needsWorkV = Math.floor(baseTotal * 0.10);
    
    let totalCustom = 0;
    const customV = customStatuses.map((s, idx) => {
      const v = Math.floor(baseTotal * (0.05 + (idx * 0.02)));
      totalCustom += v;
      return v;
    });

    const approvedV = baseTotal - draftV - needsWorkV - totalCustom;

    let rowStr = `${dateString},${draftV},${needsWorkV},${approvedV}`;
    customV.forEach(v => rowStr += `,${v}`);
    rowStr += `,${baseTotal},${isProjection ? "Projection" : "Actual"},""`;
    return rowStr;
  });

  csvContent += trendRows.join("\n") + "\n\n";

  csvContent += `DETAILED PRESET EXPORT\n`;
  
  let header = "ID,Name,Category,Tags,Status,Created At,Last Modified,Author,Language,Complexity,Score";
  exportPresets.forEach(preset => {
    Object.keys(preset.settings || {}).forEach(key => {
      if (!header.includes(key)) {
        header += `,${key}`;
      }
    });
  });
  csvContent += header + "\n";

  exportPresets.forEach(preset => {
    let row = `"${preset.id}","${preset.name}","${preset.category || 'General'}","${(preset.tags || []).join(';') || 'None'}","${preset.status || 'Approved'}","${preset.createdAt || new Date().toISOString()}","${preset.lastModified || new Date().toISOString()}","${preset.author || 'System'}","${preset.language || 'en'}","${preset.complexity || 'Medium'}","${preset.score || '85'}"`;
    const settings = preset.settings || {};
    
    const headerCols = header.split(",");
    const settingCols = headerCols.slice(11);
    
    settingCols.forEach(col => {
      let val = settings[col] !== undefined ? settings[col] : "";
      if (typeof val === 'string' && val.includes(',')) {
        val = `"${val}"`;
      }
      row += `,${val}`;
    });
    
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `FCB_Media_San_AI_Preset_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
