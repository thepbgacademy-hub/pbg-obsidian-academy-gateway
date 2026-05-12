export interface CourseManifestFile {
  path: string;
  sha256: string;
  kind: "lesson" | "assignment" | "template";
  title: string;
  body: string;
}

export interface CourseManifest {
  manifestVersion: string;
  files: CourseManifestFile[];
}

export function createPocCourseManifest(): CourseManifest {
  return {
    manifestVersion: "2026-05-12-poc",
    files: [
      {
        path: "PBG/Courses/pbg-academy-foundations/orientation/telegram-enrollment-to-academy.md",
        sha256: "poc-lesson-hash",
        kind: "lesson",
        title: "Telegram Enrollment to Academy",
        body:
          "---\n" +
          "type: lesson\n" +
          "course: pbg-academy-foundations\n" +
          "module: orientation\n" +
          "---\n\n" +
          "# Telegram Enrollment to Academy\n\n" +
          "This starter lesson confirms the PBG Vault is connected to the academy gateway.\n"
      },
      {
        path: "PBG/Assignments/connect-first-workflow.md",
        sha256: "poc-assignment-hash",
        kind: "assignment",
        title: "Connect First Workflow",
        body:
          "---\n" +
          "type: assignment\n" +
          "workflow: assignment-coach\n" +
          "---\n\n" +
          "# Connect First Workflow\n\n" +
          "- [ ] Confirm the dashboard opens\n" +
          "- [ ] Sync the starter course\n" +
          "- [ ] Run Assignment Coach\n"
      }
    ]
  };
}
