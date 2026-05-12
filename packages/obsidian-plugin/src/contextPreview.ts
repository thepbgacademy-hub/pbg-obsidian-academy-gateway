function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function createContextPreviewMessage(assignmentNoteCount: number, relatedCourseNoteCount: number): string {
  return `Sending ${assignmentNoteCount} ${pluralize(
    assignmentNoteCount,
    "assignment note",
    "assignment notes"
  )} and ${relatedCourseNoteCount} ${pluralize(
    relatedCourseNoteCount,
    "related course note",
    "related course notes"
  )}.`;
}
