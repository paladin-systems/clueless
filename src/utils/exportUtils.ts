import { PostItNote } from '../types/ui';

export type ExportFormat = 'json' | 'markdown' | 'text' | 'csv';

/**
 * Downloads a file to the user's computer
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  console.log('downloadFile called with:', { filename, mimeType, contentLength: content.length });
  
  try {
    const blob = new Blob([content], { type: mimeType });
    console.log('Blob created:', blob);
    
    const url = URL.createObjectURL(blob);
    console.log('Object URL created:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none'; // Hide the link
    
    document.body.appendChild(link);
    console.log('Link appended to body, about to click');
    
    link.click();
    console.log('Link clicked');
    
    document.body.removeChild(link);
    console.log('Link removed from body');
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    console.log('Object URL revoked');
  } catch (error) {
    console.error('Error in downloadFile:', error);
    throw error;
  }
};

/**
 * Formats a timestamp to a readable date string
 */
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Exports notes as JSON format
 */
export const exportAsJSON = (notes: PostItNote[]): void => {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalNotes: notes.length,
    notes: notes.map(note => ({
      id: note.id,
      content: note.content,
      category: note.category,
      timestamp: note.timestamp,
      lastModified: note.lastModified,
      isAiModified: note.isAiModified,
      position: note.position,
      size: note.size,
      color: note.color,
      zIndex: note.zIndex,
      createdAt: formatDate(note.timestamp),
      lastModifiedAt: formatDate(note.lastModified)
    }))
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = `clueless-notes-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(content, filename, 'application/json');
};

/**
 * Exports notes as Markdown format
 */
export const exportAsMarkdown = (notes: PostItNote[]): void => {
  let content = `# Clueless Notes Export\n\n`;
  content += `**Export Date:** ${new Date().toLocaleString()}\n`;
  content += `**Total Notes:** ${notes.length}\n\n`;
  content += `---\n\n`;

  // Group notes by category
  const notesByCategory = notes.reduce((acc, note) => {
    const category = note.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(note);
    return acc;
  }, {} as Record<string, PostItNote[]>);

  // Sort categories
  const sortedCategories = Object.keys(notesByCategory).sort();

  for (const category of sortedCategories) {
    content += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Notes\n\n`;
    
    const categoryNotes = notesByCategory[category].sort((a, b) => b.timestamp - a.timestamp);
    
    for (const note of categoryNotes) {
      content += `### ${formatDate(note.timestamp)}\n\n`;
      content += `${note.content}\n\n`;
      content += `- **Created:** ${formatDate(note.timestamp)}\n`;
      content += `- **Last Modified:** ${formatDate(note.lastModified)}\n`;
      content += `- **AI Generated:** ${note.isAiModified ? 'Yes' : 'No'}\n`;
      content += `- **Position:** (${note.position.x}, ${note.position.y})\n`;
      content += `- **Size:** ${note.size.width} × ${note.size.height}\n\n`;
      content += `---\n\n`;
    }
  }

  const filename = `clueless-notes-${new Date().toISOString().slice(0, 10)}.md`;
  downloadFile(content, filename, 'text/markdown');
};

/**
 * Exports notes as plain text format
 */
export const exportAsText = (notes: PostItNote[]): void => {
  let content = `CLUELESS NOTES EXPORT\n`;
  content += `${'='.repeat(50)}\n\n`;
  content += `Export Date: ${new Date().toLocaleString()}\n`;
  content += `Total Notes: ${notes.length}\n\n`;

  // Sort notes by timestamp (newest first)
  const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    content += `${'='.repeat(50)}\n`;
    content += `NOTE ${i + 1}\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `Category: ${note.category || 'uncategorized'}\n`;
    content += `Created: ${formatDate(note.timestamp)}\n`;
    content += `Last Modified: ${formatDate(note.lastModified)}\n`;
    content += `AI Generated: ${note.isAiModified ? 'Yes' : 'No'}\n`;
    content += `Position: (${note.position.x}, ${note.position.y})\n`;
    content += `Size: ${note.size.width} × ${note.size.height}\n\n`;
    content += `Content:\n`;
    content += `${'-'.repeat(20)}\n`;
    content += `${note.content}\n\n`;
  }

  const filename = `clueless-notes-${new Date().toISOString().slice(0, 10)}.txt`;
  downloadFile(content, filename, 'text/plain');
};

/**
 * Exports notes as CSV format
 */
export const exportAsCSV = (notes: PostItNote[]): void => {
  const headers = [
    'ID',
    'Content',
    'Category',
    'Created Date',
    'Last Modified',
    'AI Generated',
    'Position X',
    'Position Y',
    'Width',
    'Height',
    'Color',
    'Z-Index'
  ];

  let content = headers.join(',') + '\n';

  for (const note of notes) {
    const row = [
      `"${note.id}"`,
      `"${note.content.replace(/"/g, '""')}"`, // Escape quotes in content
      `"${note.category || 'uncategorized'}"`,
      `"${formatDate(note.timestamp)}"`,
      `"${formatDate(note.lastModified)}"`,
      `"${note.isAiModified ? 'Yes' : 'No'}"`,
      note.position.x.toString(),
      note.position.y.toString(),
      note.size.width.toString(),      note.size.height.toString(),
      `"${note.color}"`,
      (note.zIndex || 0).toString()
    ];
    content += row.join(',') + '\n';
  }

  const filename = `clueless-notes-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(content, filename, 'text/csv');
};

/**
 * Main export function that handles different formats
 */
export const exportNotes = (notes: PostItNote[], format: ExportFormat): void => {
  console.log('exportNotes called with:', { notesCount: notes.length, format });
  
  if (notes.length === 0) {
    console.warn('No notes to export!');
    alert('No notes to export!');
    return;
  }

  try {
    console.log('About to export notes in format:', format);
    
    switch (format) {
      case 'json':
        console.log('Exporting as JSON...');
        exportAsJSON(notes);
        break;
      case 'markdown':
        console.log('Exporting as Markdown...');
        exportAsMarkdown(notes);
        break;
      case 'text':
        console.log('Exporting as Text...');
        exportAsText(notes);
        break;
      case 'csv':
        console.log('Exporting as CSV...');
        exportAsCSV(notes);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    console.log(`✅ Successfully exported ${notes.length} notes as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error exporting notes:', error);
    alert('Failed to export notes. Please try again.');
  }
};
